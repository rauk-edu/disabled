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
  createEmptySpecialNeedsData,
  EDITABLE_SPECIAL_NEEDS_CATEGORIES,
  MAX_COUNT_VALUE,
  MAX_SCHOOL_NAME_LENGTH,
  sanitizeCountInput,
  SPECIAL_NEEDS_CATEGORIES,
  SPECIAL_NEEDS_FIELDS,
  SPECIAL_NEEDS_GRADES,
  SpecialNeedsCategory,
  SpecialNeedsField,
  SpecialNeedsRowData,
  SpecialNeedsTableData,
} from '../types/schoolStats';

interface DisabledStudentsTableProps {
  userId: string;
  academicYear: string;
  schoolName: string;
  onTotalsChange?: (totals: {
    disabledTotal: number;
    disabledFemale: number;
    difficultyTotal: number;
    difficultyFemale: number;
  }) => void;
}

export function DisabledStudentsTable({
  userId,
  academicYear,
  schoolName,
  onTotalsChange,
}: DisabledStudentsTableProps) {
  const [data, setData] = useState<SpecialNeedsTableData>(() =>
    createEmptySpecialNeedsData()
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

  const hydrateFromDocs = useCallback(
    (docs: { id: string; data: () => Record<string, unknown> }[]) => {
      const next = createEmptySpecialNeedsData();
      for (const docSnap of docs) {
        if (!next[docSnap.id]) continue;
        const raw = docSnap.data();
        const row = { ...next[docSnap.id] };
        for (const field of SPECIAL_NEEDS_FIELDS) {
          const val = raw[field];
          row[field] =
            typeof val === 'number' && Number.isFinite(val)
              ? Math.max(0, Math.min(MAX_COUNT_VALUE, Math.trunc(val)))
              : 0;
        }
        next[docSnap.id] = row;
      }
      setData(next);
      setDirty(false);
    },
    []
  );

  // Real-time Firestore listener scoped strictly to authenticated owner
  useEffect(() => {
    if (!userId || !academicYear) return;
    setLoading(true);
    setStatus(null);

    const rowsPath = `users/${userId}/specialNeedsReports/${academicYear}/categoryRows`;
    const q = query(
      collection(
        db,
        'users',
        userId,
        'specialNeedsReports',
        academicYear,
        'categoryRows'
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
    const rowsPath = `users/${userId}/specialNeedsReports/${academicYear}/categoryRows`;
    try {
      const q = query(
        collection(
          db,
          'users',
          userId,
          'specialNeedsReports',
          academicYear,
          'categoryRows'
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
    const reportPath = `users/${userId}/specialNeedsReports/${academicYear}`;
    const rowsPath = `${reportPath}/categoryRows`;

    try {
      const reportRef = doc(
        db,
        'users',
        userId,
        'specialNeedsReports',
        academicYear
      );
      const rowsColRef = collection(
        db,
        'users',
        userId,
        'specialNeedsReports',
        academicYear,
        'categoryRows'
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
          rowCount: EDITABLE_SPECIAL_NEEDS_CATEGORIES.length,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(reportRef, {
          ownerId: userId,
          academicYear,
          schoolName: cleanSchoolName,
          rowCount: EDITABLE_SPECIAL_NEEDS_CATEGORIES.length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      EDITABLE_SPECIAL_NEEDS_CATEGORIES.forEach((cat) => {
        const rowRef = doc(rowsColRef, cat.id);
        const currentRow = data[cat.id] || ({} as SpecialNeedsRowData);
        const sanitizedFields = {} as SpecialNeedsRowData;

        for (const field of SPECIAL_NEEDS_FIELDS) {
          const rawVal = currentRow[field] ?? 0;
          sanitizedFields[field] = Math.max(
            0,
            Math.min(MAX_COUNT_VALUE, Math.trunc(rawVal))
          );
        }

        if (existingRowIds.has(cat.id)) {
          batch.update(rowRef, {
            ...sanitizedFields,
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.set(rowRef, {
            ownerId: userId,
            reportId: academicYear,
            categoryId: cat.id,
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

  const handleChange = (
    categoryId: string,
    field: SpecialNeedsField,
    raw: string
  ) => {
    const value = sanitizeCountInput(raw);
    setData((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [field]: value,
      },
    }));
    setDirty(true);
    setStatus(null);
  };

  const calculateRowTotal = useCallback(
    (categoryId: string, type: 'total' | 'female') => {
      let total = 0;
      SPECIAL_NEEDS_GRADES.forEach((grade) => {
        const field = `${grade.id}_${type}` as SpecialNeedsField;
        total += data[categoryId]?.[field] || 0;
      });
      return total;
    },
    [data]
  );

  const calculateTotalRowSum = useCallback(
    (totalCatId: string, gradeId: string, type: 'total' | 'female') => {
      let sum = 0;
      const currentIndex = SPECIAL_NEEDS_CATEGORIES.findIndex(
        (c) => c.id === totalCatId
      );
      for (let i = currentIndex + 1; i < SPECIAL_NEEDS_CATEGORIES.length; i++) {
        const cat = SPECIAL_NEEDS_CATEGORIES[i];
        if (cat.type === 'total' || cat.type === 'header') break;
        if (cat.type === 'spec') continue;
        if (cat.type === 'sub' && cat.num) {
          const field = `${gradeId}_${type}` as SpecialNeedsField;
          sum += data[cat.id]?.[field] || 0;
        }
      }
      return sum;
    },
    [data]
  );

  const calculateTotalRowGrandTotal = useCallback(
    (totalCatId: string, type: 'total' | 'female') => {
      let sum = 0;
      const currentIndex = SPECIAL_NEEDS_CATEGORIES.findIndex(
        (c) => c.id === totalCatId
      );
      for (let i = currentIndex + 1; i < SPECIAL_NEEDS_CATEGORIES.length; i++) {
        const cat = SPECIAL_NEEDS_CATEGORIES[i];
        if (cat.type === 'total' || cat.type === 'header') break;
        if (cat.type === 'spec') continue;
        if (cat.type === 'sub' && cat.num) {
          sum += calculateRowTotal(cat.id, type);
        }
      }
      return sum;
    },
    [calculateRowTotal]
  );

  const summaryTotals = useMemo(
    () => ({
      disabledTotal: calculateTotalRowGrandTotal('disabled_count', 'total'),
      disabledFemale: calculateTotalRowGrandTotal('disabled_count', 'female'),
      difficultyTotal: calculateTotalRowGrandTotal('difficulty_count', 'total'),
      difficultyFemale: calculateTotalRowGrandTotal('difficulty_count', 'female'),
    }),
    [calculateTotalRowGrandTotal]
  );

  useEffect(() => {
    onTotalsChange?.(summaryTotals);
  }, [summaryTotals, onTotalsChange]);

  const hasFemaleMismatch = useMemo(() => {
    for (const cat of EDITABLE_SPECIAL_NEEDS_CATEGORIES) {
      const row = data[cat.id];
      if (!row) continue;
      for (const grade of SPECIAL_NEEDS_GRADES) {
        const totalField = `${grade.id}_total` as SpecialNeedsField;
        const femaleField = `${grade.id}_female` as SpecialNeedsField;
        if ((row[femaleField] || 0) > (row[totalField] || 0)) {
          return true;
        }
      }
    }
    return false;
  }, [data]);

  const getRowClass = (cat: SpecialNeedsCategory) => {
    if (cat.type === 'header') return 'bg-blue-100/80 text-slate-900';
    if (cat.type === 'total') return 'bg-rose-50 text-rose-950';
    if (cat.type === 'spec') return 'bg-orange-50 text-orange-950';
    return 'bg-white hover:bg-slate-50/80 text-slate-900';
  };

  const getStickyCellClass = (cat: SpecialNeedsCategory) => {
    if (cat.type === 'header') return 'bg-blue-100 text-slate-900 font-semibold';
    if (cat.type === 'total') return 'bg-rose-50 text-rose-950 font-semibold';
    if (cat.type === 'spec') return 'bg-orange-50 text-orange-950 font-medium';
    return 'bg-white text-slate-800';
  };

  const downloadCSV = () => {
    let csv = '\uFEFF';
    csv += `២.(ខ១) សិស្សពិការ សិស្សជួបការលំបាកផ្នែកសុខភាព និងសិស្សជួបការលំបាក (${academicYear})\n`;
    csv += 'បរិយាយ';
    SPECIAL_NEEDS_GRADES.forEach((grade) => {
      csv += `,${grade.label} សរុប,${grade.label} ស្រី`;
    });
    csv += ',សរុប សរុប,សរុប ស្រី\n';

    SPECIAL_NEEDS_CATEGORIES.forEach((cat) => {
      const escapedLabel = `"${cat.label.replace(/"/g, '""')}"`;
      csv += escapedLabel;
      SPECIAL_NEEDS_GRADES.forEach((grade) => {
        if (cat.type === 'header' || cat.type === 'spec') {
          csv += ',0,0';
        } else if (cat.type === 'total') {
          csv += `,${calculateTotalRowSum(cat.id, grade.id, 'total')},${calculateTotalRowSum(
            cat.id,
            grade.id,
            'female'
          )}`;
        } else {
          const tField = `${grade.id}_total` as SpecialNeedsField;
          const fField = `${grade.id}_female` as SpecialNeedsField;
          csv += `,${data[cat.id]?.[tField] || 0},${data[cat.id]?.[fField] || 0}`;
        }
      });

      const grandTotal =
        cat.type === 'total'
          ? calculateTotalRowGrandTotal(cat.id, 'total')
          : cat.type === 'header' || cat.type === 'spec'
          ? 0
          : calculateRowTotal(cat.id, 'total');
      const grandFemale =
        cat.type === 'total'
          ? calculateTotalRowGrandTotal(cat.id, 'female')
          : cat.type === 'header' || cat.type === 'spec'
          ? 0
          : calculateRowTotal(cat.id, 'female');
      csv += `,${grandTotal},${grandFemale}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Disabled_Students_${academicYear}.csv`;
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
                rowSpan={2}
                className="border-b border-r border-slate-300 px-3 py-2 text-left min-w-64 font-semibold sticky left-0 bg-slate-100 z-20"
              >
                បរិយាយ
              </th>
              {SPECIAL_NEEDS_GRADES.map((grade) => (
                <th
                  key={grade.id}
                  colSpan={2}
                  className="border-b border-r border-slate-300 px-2 py-2 font-semibold whitespace-nowrap"
                >
                  {grade.label}
                </th>
              ))}
              <th
                colSpan={2}
                className="border-b border-slate-300 px-2 py-2 font-semibold bg-amber-100 text-slate-900"
              >
                សរុប
              </th>
            </tr>
            <tr className="bg-slate-50 text-slate-600">
              {SPECIAL_NEEDS_GRADES.map((grade) => (
                <React.Fragment key={grade.id}>
                  <th className="border-b border-r border-slate-300 px-1.5 py-1 font-medium">
                    សរុប
                  </th>
                  <th className="border-b border-r border-slate-300 px-1.5 py-1 font-medium">
                    ស្រី
                  </th>
                </React.Fragment>
              ))}
              <th className="border-b border-r border-slate-300 px-2 py-1 font-medium bg-amber-50 text-slate-900">
                សរុប
              </th>
              <th className="border-b border-slate-300 px-2 py-1 font-medium bg-amber-50 text-slate-900">
                ស្រី
              </th>
            </tr>
          </thead>

          <tbody>
            {SPECIAL_NEEDS_CATEGORIES.map((cat) => {
              const editable = cat.type === 'sub';
              return (
                <tr key={cat.id} className={getRowClass(cat)}>
                  <td
                    className={`border-b border-r border-slate-300 px-3 py-1.5 sticky left-0 z-10 text-left ${getStickyCellClass(
                      cat
                    )} ${cat.type === 'sub' ? 'pl-6' : ''}`}
                  >
                    {cat.num ? `${cat.num}. ${cat.label}` : cat.label}
                  </td>

                  {SPECIAL_NEEDS_GRADES.map((grade) => {
                    const totalField = `${grade.id}_total` as SpecialNeedsField;
                    const femaleField = `${grade.id}_female` as SpecialNeedsField;
                    const totalVal = data[cat.id]?.[totalField] ?? 0;
                    const femaleVal = data[cat.id]?.[femaleField] ?? 0;
                    const mismatch = editable && femaleVal > totalVal;

                    return (
                      <React.Fragment key={grade.id}>
                        <td className="border-b border-r border-slate-300 p-0">
                          {cat.type === 'header' ? (
                            <div className="h-7 bg-blue-100/80" />
                          ) : cat.type === 'total' ? (
                            <div className="px-1.5 py-1.5 text-center font-mono tabular-nums font-bold text-rose-950">
                              {calculateTotalRowSum(cat.id, grade.id, 'total')}
                            </div>
                          ) : cat.type === 'spec' ? (
                            <div className="h-7 bg-orange-50" />
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={MAX_COUNT_VALUE}
                              disabled={loading}
                              aria-label={`${cat.label} ${grade.label} សរុប`}
                              value={totalVal}
                              onChange={(e) =>
                                handleChange(cat.id, totalField, e.target.value)
                              }
                              className="w-12 sm:w-full min-w-11 px-1 py-1.5 text-center font-mono tabular-nums text-xs bg-transparent text-slate-900 focus:outline-none focus:bg-blue-50"
                            />
                          )}
                        </td>

                        <td
                          className={`border-b border-r border-slate-300 p-0 ${
                            mismatch ? 'bg-amber-50' : ''
                          }`}
                        >
                          {cat.type === 'header' ? (
                            <div className="h-7 bg-blue-100/80" />
                          ) : cat.type === 'total' ? (
                            <div className="px-1.5 py-1.5 text-center font-mono tabular-nums font-bold text-rose-950">
                              {calculateTotalRowSum(cat.id, grade.id, 'female')}
                            </div>
                          ) : cat.type === 'spec' ? (
                            <div className="h-7 bg-orange-50" />
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={MAX_COUNT_VALUE}
                              disabled={loading}
                              aria-label={`${cat.label} ${grade.label} ស្រី`}
                              value={femaleVal}
                              onChange={(e) =>
                                handleChange(cat.id, femaleField, e.target.value)
                              }
                              className={`w-12 sm:w-full min-w-11 px-1 py-1.5 text-center font-mono tabular-nums text-xs focus:outline-none focus:bg-blue-50 ${
                                mismatch
                                  ? 'bg-amber-50 text-amber-900 font-semibold'
                                  : 'bg-transparent text-slate-900'
                              }`}
                            />
                          )}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  <td className="border-b border-r border-slate-300 px-2 py-1.5 text-center bg-amber-100/80 font-mono tabular-nums font-bold text-slate-900">
                    {cat.type === 'total'
                      ? calculateTotalRowGrandTotal(cat.id, 'total')
                      : cat.type === 'header' || cat.type === 'spec'
                      ? ''
                      : calculateRowTotal(cat.id, 'total')}
                  </td>
                  <td className="border-b border-slate-300 px-2 py-1.5 text-center bg-amber-100/80 font-mono tabular-nums font-bold text-slate-900">
                    {cat.type === 'total'
                      ? calculateTotalRowGrandTotal(cat.id, 'female')
                      : cat.type === 'header' || cat.type === 'spec'
                      ? ''
                      : calculateRowTotal(cat.id, 'female')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-600 leading-relaxed space-y-1">
        <p className="font-semibold text-slate-800">ចំណាំ</p>
        <p>
          ** ប្រភេទអាចមានច្រើនជាងចំនួនសរុប (សិស្សម្នាក់អាចមានពិការភាពច្រើនប្រភេទ)។
        </p>
        <p>
          ជួរពណ៌ខៀវជាចំណងជើងផ្នែក · ជួរពណ៌ក្រហម (ចំនួនសរុប*) គណនាស្វ័យប្រវត្តិពីជួរមានលេខរៀង ·
          ជួរពណ៌ទឹកក្រូច (ប្រភេទ**) និងជួរឈរពណ៌លឿង (សរុប) មិនអាចកែប្រែដោយផ្ទាល់បានទេ។
        </p>
      </div>
    </div>
  );
}
