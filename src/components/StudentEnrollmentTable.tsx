import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  RefreshCw,
  Save,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  createEmptyEnrollmentData,
  ENROLLMENT_AGES,
  ENROLLMENT_FIELDS,
  EnrollmentField,
  EnrollmentRowData,
  EnrollmentTableData,
  MAX_COUNT_VALUE,
  MAX_SCHOOL_NAME_LENGTH,
  sanitizeCountInput,
} from '../types/schoolStats';

interface StudentEnrollmentTableProps {
  userId: string;
  academicYear: string;
  schoolName: string;
  onTotalsChange?: (totals: {
    newPromoteTotal: number;
    newPromoteFemale: number;
    repeatTotal: number;
    repeatFemale: number;
  }) => void;
}

export function StudentEnrollmentTable({
  userId,
  academicYear,
  schoolName,
  onTotalsChange,
}: StudentEnrollmentTableProps) {
  const [data, setData] = useState<EnrollmentTableData>(() =>
    createEmptyEnrollmentData()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  const isCellDisabled = useCallback((ageIndex: number, field: EnrollmentField) => {
    const start = ENROLLMENT_AGES[ageIndex]?.disabledStartIndex ?? Infinity;
    const fieldIndex = ENROLLMENT_FIELDS.indexOf(field);
    return fieldIndex >= start;
  }, []);

  const hydrateFromDocs = useCallback(
    (docs: { id: string; data: () => Record<string, unknown> }[]) => {
      const next = createEmptyEnrollmentData();
      for (const docSnap of docs) {
        const raw = docSnap.data();
        const ageDef = ENROLLMENT_AGES.find((a) => a.id === docSnap.id);
        if (!ageDef) continue;
        const ageIdx = ENROLLMENT_AGES.indexOf(ageDef);
        const row = { ...next[ageDef.id] };
        for (const field of ENROLLMENT_FIELDS) {
          if (isCellDisabled(ageIdx, field)) {
            row[field] = 0;
          } else {
            const val = raw[field];
            row[field] =
              typeof val === 'number' && Number.isFinite(val)
                ? Math.max(0, Math.min(MAX_COUNT_VALUE, Math.trunc(val)))
                : 0;
          }
        }
        next[ageDef.id] = row;
      }
      setData(next);
      setDirty(false);
    },
    [isCellDisabled]
  );

  // Real-time Firestore listener scoped strictly to authenticated owner
  useEffect(() => {
    if (!userId || !academicYear) return;
    setLoading(true);
    setStatus(null);

    const rowsPath = `users/${userId}/enrollmentReports/${academicYear}/ageRows`;
    const q = query(
      collection(
        db,
        'users',
        userId,
        'enrollmentReports',
        academicYear,
        'ageRows'
      ),
      where('ownerId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        hydrateFromDocs(snapshot.docs);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, rowsPath);
        } catch (wrapped) {
          setFatalError(wrapped as Error);
        }
      }
    );

    return () => unsubscribe();
  }, [userId, academicYear, hydrateFromDocs]);

  const loadFromFirestore = async () => {
    setLoading(true);
    setStatus(null);
    const rowsPath = `users/${userId}/enrollmentReports/${academicYear}/ageRows`;
    try {
      const q = query(
        collection(
          db,
          'users',
          userId,
          'enrollmentReports',
          academicYear,
          'ageRows'
        ),
        where('ownerId', '==', userId)
      );
      const snapshot = await getDocsFromServer(q);
      hydrateFromDocs(snapshot.docs);
      setStatus({
        type: 'success',
        text: 'ទាញទិន្នន័យពី Cloud Firestore បានជោគជ័យ។',
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.LIST, rowsPath);
      } catch (wrapped) {
        setFatalError(wrapped as Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToFirestore = async () => {
    setSaving(true);
    setStatus(null);
    const reportPath = `users/${userId}/enrollmentReports/${academicYear}`;
    const rowsPath = `${reportPath}/ageRows`;

    try {
      const reportRef = doc(
        db,
        'users',
        userId,
        'enrollmentReports',
        academicYear
      );
      const rowsColRef = collection(
        db,
        'users',
        userId,
        'enrollmentReports',
        academicYear,
        'ageRows'
      );

      const [parentSnap, existingRowsSnap] = await Promise.all([
        getDoc(reportRef),
        getDocs(query(rowsColRef, where('ownerId', '==', userId))),
      ]);

      const existingRowIds = new Set(existingRowsSnap.docs.map((d) => d.id));
      const cleanSchoolName = schoolName.trim().slice(0, MAX_SCHOOL_NAME_LENGTH);

      const batch = writeBatch(db);

      if (parentSnap.exists()) {
        batch.update(reportRef, {
          schoolName: cleanSchoolName,
          rowCount: ENROLLMENT_AGES.length,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(reportRef, {
          ownerId: userId,
          academicYear,
          schoolName: cleanSchoolName,
          rowCount: ENROLLMENT_AGES.length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      ENROLLMENT_AGES.forEach((age, ageIdx) => {
        const rowRef = doc(rowsColRef, age.id);
        const currentRow = data[age.id] || ({} as EnrollmentRowData);
        const sanitizedFields = {} as EnrollmentRowData;

        for (const field of ENROLLMENT_FIELDS) {
          if (isCellDisabled(ageIdx, field)) {
            sanitizedFields[field] = 0;
          } else {
            const rawVal = currentRow[field] ?? 0;
            sanitizedFields[field] = Math.max(
              0,
              Math.min(MAX_COUNT_VALUE, Math.trunc(rawVal))
            );
          }
        }

        if (existingRowIds.has(age.id)) {
          batch.update(rowRef, {
            ...sanitizedFields,
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.set(rowRef, {
            ownerId: userId,
            reportId: academicYear,
            ageId: age.id,
            ...sanitizedFields,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });

      await batch.commit();
      setDirty(false);
      setStatus({
        type: 'success',
        text: 'រក្សាទុកទិន្នន័យទៅ Cloud Firestore បានជោគជ័យ។',
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, rowsPath);
      } catch (wrapped) {
        setFatalError(wrapped as Error);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (ageId: string, field: EnrollmentField, raw: string) => {
    const value = sanitizeCountInput(raw);
    setData((prev) => ({
      ...prev,
      [ageId]: {
        ...prev[ageId],
        [field]: value,
      },
    }));
    setDirty(true);
    setStatus(null);
  };

  const calculateRowTotal = useCallback(
    (
      ageId: string,
      type: 'new_promote' | 'new_promote_female' | 'repeat' | 'repeat_female'
    ) => {
      const row = data[ageId];
      if (!row) return 0;
      if (type === 'new_promote') {
        return (
          (row.g1_new_total || 0) +
          (row.g2_promote_total || 0) +
          (row.g3_promote_total || 0) +
          (row.g4_promote_total || 0) +
          (row.g5_promote_total || 0) +
          (row.g6_promote_total || 0)
        );
      }
      if (type === 'new_promote_female') {
        return (
          (row.g1_new_female || 0) +
          (row.g2_promote_female || 0) +
          (row.g3_promote_female || 0) +
          (row.g4_promote_female || 0) +
          (row.g5_promote_female || 0) +
          (row.g6_promote_female || 0)
        );
      }
      if (type === 'repeat') {
        return (
          (row.g1_repeat_total || 0) +
          (row.g2_repeat_total || 0) +
          (row.g3_repeat_total || 0) +
          (row.g4_repeat_total || 0) +
          (row.g5_repeat_total || 0) +
          (row.g6_repeat_total || 0)
        );
      }
      return (
        (row.g1_repeat_female || 0) +
        (row.g2_repeat_female || 0) +
        (row.g3_repeat_female || 0) +
        (row.g4_repeat_female || 0) +
        (row.g5_repeat_female || 0) +
        (row.g6_repeat_female || 0)
      );
    },
    [data]
  );

  const calculateGradeTotal = useCallback(
    (field: EnrollmentField) =>
      ENROLLMENT_AGES.reduce(
        (sum, age) => sum + (data[age.id]?.[field] || 0),
        0
      ),
    [data]
  );

  const grandTotals = useMemo(() => {
    const newPromoteTotal = ENROLLMENT_AGES.reduce(
      (sum, age) => sum + calculateRowTotal(age.id, 'new_promote'),
      0
    );
    const newPromoteFemale = ENROLLMENT_AGES.reduce(
      (sum, age) => sum + calculateRowTotal(age.id, 'new_promote_female'),
      0
    );
    const repeatTotal = ENROLLMENT_AGES.reduce(
      (sum, age) => sum + calculateRowTotal(age.id, 'repeat'),
      0
    );
    const repeatFemale = ENROLLMENT_AGES.reduce(
      (sum, age) => sum + calculateRowTotal(age.id, 'repeat_female'),
      0
    );
    return { newPromoteTotal, newPromoteFemale, repeatTotal, repeatFemale };
  }, [calculateRowTotal]);

  useEffect(() => {
    onTotalsChange?.(grandTotals);
  }, [grandTotals, onTotalsChange]);

  // Detect any cell where female > total for soft inline warning
  const hasFemaleMismatch = useMemo(() => {
    for (let i = 0; i < ENROLLMENT_AGES.length; i++) {
      const ageId = ENROLLMENT_AGES[i].id;
      const row = data[ageId];
      if (!row) continue;
      for (let f = 0; f < ENROLLMENT_FIELDS.length; f += 2) {
        const totalField = ENROLLMENT_FIELDS[f];
        const femaleField = ENROLLMENT_FIELDS[f + 1];
        if ((row[femaleField] || 0) > (row[totalField] || 0)) {
          return true;
        }
      }
    }
    return false;
  }, [data]);

  const downloadCSV = () => {
    let csv = '\uFEFF';
    csv += `២.(ក២) សិស្សថ្មី សិស្សឡើងថ្នាក់ និងសិស្សត្រួតថ្នាក់ ក្នុងឆ្នាំសិក្សា ${academicYear}\n`;
    csv +=
      'អាយុ(ឆ្នាំ),ថ្នាក់ទី ១,,,,ថ្នាក់ទី ២,,,,ថ្នាក់ទី ៣,,,,ថ្នាក់ទី ៤,,,,ថ្នាក់ទី ៥,,,,ថ្នាក់ទី ៦,,,,សរុបរួម,,,\n';
    csv +=
      ',សិស្សថ្មី,,សិស្សត្រួត,,សិស្សឡើង,,សិស្សត្រួត,,សិស្សឡើង,,សិស្សត្រួត,,សិស្សឡើង,,សិស្សត្រួត,,សិស្សឡើង,,សិស្សត្រួត,,សិស្សឡើង,,សិស្សត្រួត,,សិស្សថ្មី/ឡើង,,សិស្សត្រួត,\n';
    csv +=
      ',សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី,សរុប,ស្រី\n';

    ENROLLMENT_AGES.forEach((age) => {
      const r = data[age.id];
      const vals = ENROLLMENT_FIELDS.map((f) => r?.[f] || 0);
      csv += `${age.label},${vals.join(',')},${calculateRowTotal(
        age.id,
        'new_promote'
      )},${calculateRowTotal(
        age.id,
        'new_promote_female'
      )},${calculateRowTotal(age.id, 'repeat')},${calculateRowTotal(
        age.id,
        'repeat_female'
      )}\n`;
    });

    const footerVals = ENROLLMENT_FIELDS.map((f) => calculateGradeTotal(f));
    csv += `សរុប,${footerVals.join(',')},${grandTotals.newPromoteTotal},${grandTotals.newPromoteFemale},${grandTotals.repeatTotal},${grandTotals.repeatFemale}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Student_Enrollment_${academicYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>ឆ្នាំសិក្សា {academicYear}</span>
          <span aria-hidden="true">·</span>
          <span>
            {loading
              ? 'កំពុងទាញទិន្នន័យ...'
              : dirty
              ? 'មានការកែប្រែមិនទាន់រក្សាទុក'
              : 'ទិន្នន័យបានធ្វើសមកាលកម្ម'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadFromFirestore}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'កំពុងទាញ...' : 'ទាញទិន្នន័យ'}
          </button>

          <button
            type="button"
            onClick={saveToFirestore}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
          </button>

          <button
            type="button"
            onClick={downloadCSV}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {status && (
        <div
          role="status"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
            status.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      {hasFemaleMismatch && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-amber-50 border border-amber-200 text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            សូមពិនិត្យ៖ មានប្រអប់ដែលចំនួនសិស្សស្រីច្រើនជាងចំនួនសិស្សសរុប។
          </span>
        </div>
      )}

      <div className="overflow-x-auto border border-slate-300 rounded-lg">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th
                rowSpan={3}
                className="border-b border-r border-slate-300 px-2.5 py-2 min-w-14 font-semibold text-center sticky left-0 bg-slate-100 z-10"
              >
                អាយុ
              </th>
              <th colSpan={4} className="border-b border-r border-slate-300 p-2 font-semibold">
                ថ្នាក់ទី ១
              </th>
              <th colSpan={4} className="border-b border-r border-slate-300 p-2 font-semibold">
                ថ្នាក់ទី ២
              </th>
              <th colSpan={4} className="border-b border-r border-slate-300 p-2 font-semibold">
                ថ្នាក់ទី ៣
              </th>
              <th colSpan={4} className="border-b border-r border-slate-300 p-2 font-semibold">
                ថ្នាក់ទី ៤
              </th>
              <th colSpan={4} className="border-b border-r border-slate-300 p-2 font-semibold">
                ថ្នាក់ទី ៥
              </th>
              <th colSpan={4} className="border-b border-r border-slate-300 p-2 font-semibold">
                ថ្នាក់ទី ៦
              </th>
              <th
                colSpan={4}
                className="border-b border-slate-300 p-2 font-semibold bg-emerald-50 text-emerald-900"
              >
                សរុបរួម
              </th>
            </tr>
            <tr className="bg-slate-50 text-slate-700">
              <th colSpan={2} className="border-b border-r border-slate-300 p-1.5 font-medium">
                ថ្មី
              </th>
              <th colSpan={2} className="border-b border-r border-slate-300 p-1.5 font-medium">
                ត្រួត
              </th>
              {Array.from({ length: 5 }).map((_, idx) => (
                <React.Fragment key={idx}>
                  <th colSpan={2} className="border-b border-r border-slate-300 p-1.5 font-medium">
                    ឡើង
                  </th>
                  <th colSpan={2} className="border-b border-r border-slate-300 p-1.5 font-medium">
                    ត្រួត
                  </th>
                </React.Fragment>
              ))}
              <th
                colSpan={2}
                className="border-b border-r border-slate-300 p-1.5 font-medium bg-emerald-50 text-emerald-900"
              >
                ថ្មី/ឡើង
              </th>
              <th
                colSpan={2}
                className="border-b border-slate-300 p-1.5 font-medium bg-emerald-50 text-emerald-900"
              >
                ត្រួត
              </th>
            </tr>
            <tr className="bg-slate-50 text-slate-600">
              {Array.from({ length: 14 }).map((_, i) => (
                <React.Fragment key={i}>
                  <th
                    className={`border-b border-r border-slate-300 px-1.5 py-1 font-medium ${
                      i >= 12 ? 'bg-emerald-50/70' : ''
                    }`}
                  >
                    សរុប
                  </th>
                  <th
                    className={`border-b ${
                      i < 13 ? 'border-r' : ''
                    } border-slate-300 px-1.5 py-1 font-medium ${
                      i >= 12 ? 'bg-emerald-50/70' : ''
                    }`}
                  >
                    ស្រី
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {ENROLLMENT_AGES.map((age, ageIdx) => (
              <tr key={age.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="border-b border-r border-slate-300 px-2 py-1.5 font-semibold text-center text-slate-900 sticky left-0 bg-white z-10 tabular-nums">
                  {age.label}
                </td>

                {ENROLLMENT_FIELDS.map((field, fieldIdx) => {
                  const disabled = isCellDisabled(ageIdx, field);
                  const val = data[age.id]?.[field] ?? 0;
                  const isFemaleCol = fieldIdx % 2 === 1;
                  const pairTotalField = isFemaleCol
                    ? ENROLLMENT_FIELDS[fieldIdx - 1]
                    : field;
                  const mismatch =
                    !disabled &&
                    isFemaleCol &&
                    val > (data[age.id]?.[pairTotalField] || 0);

                  return (
                    <td
                      key={field}
                      className={`border-b border-r border-slate-300 p-0 ${
                        disabled
                          ? 'bg-slate-900 pointer-events-none select-none'
                          : mismatch
                          ? 'bg-amber-50'
                          : 'bg-white'
                      }`}
                    >
                      <input
                        type="number"
                        min={0}
                        max={MAX_COUNT_VALUE}
                        disabled={disabled || loading}
                        tabIndex={disabled ? -1 : 0}
                        aria-label={`អាយុ ${age.label} ${field}`}
                        value={disabled ? '' : val}
                        onChange={(e) =>
                          handleChange(age.id, field, e.target.value)
                        }
                        className={`w-12 sm:w-full min-w-11 px-1 py-1.5 text-center font-mono tabular-nums text-xs focus:outline-none focus:bg-blue-50 ${
                          disabled
                            ? 'bg-slate-900 text-transparent'
                            : mismatch
                            ? 'bg-amber-50 text-amber-900 font-semibold'
                            : 'bg-transparent text-slate-900'
                        }`}
                      />
                    </td>
                  );
                })}

                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-center bg-emerald-50/70 font-semibold font-mono tabular-nums text-slate-900">
                  {calculateRowTotal(age.id, 'new_promote')}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-center bg-emerald-50/70 font-semibold font-mono tabular-nums text-slate-900">
                  {calculateRowTotal(age.id, 'new_promote_female')}
                </td>
                <td className="border-b border-r border-slate-300 px-2 py-1.5 text-center bg-emerald-50/70 font-semibold font-mono tabular-nums text-slate-900">
                  {calculateRowTotal(age.id, 'repeat')}
                </td>
                <td className="border-b border-slate-300 px-2 py-1.5 text-center bg-emerald-50/70 font-semibold font-mono tabular-nums text-slate-900">
                  {calculateRowTotal(age.id, 'repeat_female')}
                </td>
              </tr>
            ))}

            <tr className="bg-amber-50 font-bold text-slate-900">
              <td className="border-r border-slate-300 px-2 py-2 text-center sticky left-0 bg-amber-50 z-10">
                សរុប
              </td>
              {ENROLLMENT_FIELDS.map((field) => (
                <td
                  key={field}
                  className="border-r border-slate-300 px-1 py-2 text-center font-mono tabular-nums"
                >
                  {calculateGradeTotal(field)}
                </td>
              ))}
              <td className="border-r border-slate-300 px-2 py-2 text-center bg-amber-100 font-mono tabular-nums">
                {grandTotals.newPromoteTotal}
              </td>
              <td className="border-r border-slate-300 px-2 py-2 text-center bg-amber-100 font-mono tabular-nums">
                {grandTotals.newPromoteFemale}
              </td>
              <td className="border-r border-slate-300 px-2 py-2 text-center bg-amber-100 font-mono tabular-nums">
                {grandTotals.repeatTotal}
              </td>
              <td className="px-2 py-2 text-center bg-amber-100 font-mono tabular-nums">
                {grandTotals.repeatFemale}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-800 mb-1">របៀបប្រើប្រាស់</p>
        <p>
          ១. បញ្ចូលចំនួនសិស្សក្នុងប្រអប់ពណ៌ស (ប្រអប់ពណ៌ខ្មៅត្រូវបានបិទតាមកម្រិតអាយុ)។
          សរុបជួរដេក និងជួរឈរត្រូវបានគណនាស្វ័យប្រវត្តិ។
        </p>
        <p>
          ២. ចុច «រក្សាទុក» ដើម្បីរក្សាទុកទៅ Cloud Firestore តាមគណនីរបស់អ្នក ឬ «ទាញទិន្នន័យ»
          ដើម្បីផ្ទុកទិន្នន័យចុងក្រោយបំផុតពីម៉ាស៊ីនមេ។
        </p>
      </div>
    </div>
  );
}
