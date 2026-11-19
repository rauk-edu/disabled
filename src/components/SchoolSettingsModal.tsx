import React, { useState, useEffect } from 'react';
import { X, Save, CheckCircle2 } from 'lucide-react';
import { ACADEMIC_YEARS, MAX_SCHOOL_NAME_LENGTH } from '../types/schoolStats';

interface SchoolSettingsModalProps {
  open: boolean;
  onClose: () => void;
  schoolName: string;
  academicYear: string;
  email: string;
  displayName: string;
  onSave: (updates: { schoolName: string; academicYear: string }) => Promise<void>;
}

export function SchoolSettingsModal({
  open,
  onClose,
  schoolName,
  academicYear,
  email,
  displayName,
  onSave,
}: SchoolSettingsModalProps) {
  const [draftSchool, setDraftSchool] = useState(schoolName);
  const [draftYear, setDraftYear] = useState(academicYear);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftSchool(schoolName);
      setDraftYear(academicYear);
      setSavedNotice(false);
    }
  }, [open, schoolName, academicYear]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      await onSave({ schoolName: draftSchool, academicYear: draftYear });
      setSavedNotice(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3
            id="settings-modal-title"
            className="text-base font-semibold text-slate-900"
          >
            ការកំណត់សាលា និងឆ្នាំសិក្សា
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="បិទ"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-xs text-slate-600 space-y-1">
            <p>
              គណនី៖ <span className="font-medium text-slate-900">{displayName}</span>
            </p>
            <p className="font-mono text-slate-500">{email}</p>
          </div>

          <div>
            <label
              htmlFor="school-name-input"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              ឈ្មោះសាលាបឋមសិក្សា
            </label>
            <input
              id="school-name-input"
              type="text"
              maxLength={MAX_SCHOOL_NAME_LENGTH}
              value={draftSchool}
              onChange={(e) => setDraftSchool(e.target.value)}
              placeholder="ឧ. សាលាបឋមសិក្សាគំរូ"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
            />
          </div>

          <div>
            <label
              htmlFor="academic-year-select"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              ឆ្នាំសិក្សាសកម្ម
            </label>
            <select
              id="academic-year-select"
              value={draftYear}
              onChange={(e) => setDraftYear(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-700 font-mono"
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {savedNotice && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>បានរក្សាទុកការកំណត់។</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
