import { useState, useCallback } from 'react';
import { LogOut, LogIn } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGate } from './components/AuthGate';
import { CollapsiblePanel } from './components/CollapsiblePanel';
import { StudentEnrollmentTable } from './components/StudentEnrollmentTable';
import { DisabledStudentsTable } from './components/DisabledStudentsTable';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';

function RegistryWorkspace() {
  const {
    user,
    profile,
    authReady,
    signingIn,
    authError,
    signInWithGoogle,
    logout,
    updateProfileSettings,
  } = useAuth();

  const [enrollmentOpen, setEnrollmentOpen] = useState(true);
  const [disabledOpen, setDisabledOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [enrollmentSummary, setEnrollmentSummary] = useState({
    newPromoteTotal: 0,
    newPromoteFemale: 0,
    repeatTotal: 0,
    repeatFemale: 0,
  });

  const [specialNeedsSummary, setSpecialNeedsSummary] = useState({
    disabledTotal: 0,
    disabledFemale: 0,
    difficultyTotal: 0,
    difficultyFemale: 0,
  });

  const handleEnrollmentTotals = useCallback(
    (totals: {
      newPromoteTotal: number;
      newPromoteFemale: number;
      repeatTotal: number;
      repeatFemale: number;
    }) => {
      setEnrollmentSummary(totals);
    },
    []
  );

  const handleSpecialNeedsTotals = useCallback(
    (totals: {
      disabledTotal: number;
      disabledFemale: number;
      difficultyTotal: number;
      difficultyFemale: number;
    }) => {
      setSpecialNeedsSummary(totals);
    },
    []
  );

  const activeAcademicYear = profile?.academicYear || '2025-2026';
  const activeSchoolName = profile?.schoolName || '';

  const jumpToPanel = (panel: 'enrollment' | 'disabled') => {
    if (panel === 'enrollment') {
      setEnrollmentOpen(true);
      document
        .getElementById('panel-enrollment')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setDisabledOpen(true);
      document
        .getElementById('panel-disabled')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title */}
          <a
            href="#top"
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            ស្ថិតិសិស្សបឋមសិក្សា
          </a>

          {/* Zone 2: Concise single-line navigation links */}
          {user && (
            <nav
              aria-label="ម៉ឺនុយចម្បង"
              className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
            >
              <button
                type="button"
                onClick={() => jumpToPanel('enrollment')}
                className="hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                តារាង ២.(ក២)
              </button>
              <button
                type="button"
                onClick={() => jumpToPanel('disabled')}
                className="hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                តារាង ២.(ខ១)
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                ការកំណត់សាលា
              </button>
            </nav>
          )}

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            {!authReady ? (
              <span className="text-xs text-slate-400 whitespace-nowrap">
                កំពុងផ្ទៀងផ្ទាត់...
              </span>
            ) : user ? (
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                ចាកចេញ
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={signingIn}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                {signingIn ? 'កំពុងភ្ជាប់...' : 'ចូលប្រើប្រាស់'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {!authReady ? (
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-12 space-y-4">
            <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
          </div>
        ) : !user ? (
          <AuthGate
            signingIn={signingIn}
            authError={authError}
            onSignIn={signInWithGoogle}
          />
        ) : (
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Contextual Workspace Metadata & School Controls */}
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                  {activeSchoolName || 'បញ្ជីស្ថិតិសិស្សប្រចាំឆ្នាំសិក្សា'}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{profile?.displayName || user.displayName || 'គណនីសាលា'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{user.email}</span>
                  <span aria-hidden="true">·</span>
                  <span>ឆ្នាំសិក្សា {activeAcademicYear}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  កែប្រែឈ្មោះសាលា / ឆ្នាំសិក្សា
                </button>
              </div>
            </div>

            {/* 4-Column Summary KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              <div className="p-4">
                <p className="text-xs text-slate-500">សិស្សថ្មី និងឡើងថ្នាក់សរុប</p>
                <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {enrollmentSummary.newPromoteTotal}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                  ស្រី {enrollmentSummary.newPromoteFemale} នាក់
                </p>
              </div>

              <div className="p-4">
                <p className="text-xs text-slate-500">សិស្សត្រួតថ្នាក់សរុប</p>
                <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {enrollmentSummary.repeatTotal}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                  ស្រី {enrollmentSummary.repeatFemale} នាក់
                </p>
              </div>

              <div className="p-4">
                <p className="text-xs text-slate-500">ចំនួនសិស្សពិការ*</p>
                <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {specialNeedsSummary.disabledTotal}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                  ស្រី {specialNeedsSummary.disabledFemale} នាក់
                </p>
              </div>

              <div className="p-4">
                <p className="text-xs text-slate-500">ចំនួនសិស្សជួបការលំបាក*</p>
                <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {specialNeedsSummary.difficultyTotal}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                  ស្រី {specialNeedsSummary.difficultyFemale} នាក់
                </p>
              </div>
            </div>

            {/* Two Collapsible Data Entry Panels */}
            <div className="space-y-5">
              <CollapsiblePanel
                id="panel-enrollment"
                title={`២.(ក២) សិស្សថ្មី សិស្សឡើងថ្នាក់ និងសិស្សត្រួតថ្នាក់ ${activeAcademicYear}`}
                subtitle="បែងចែកតាមអាយុ (៦ ដល់ ១៥+ ឆ្នាំ) និងកម្រិតថ្នាក់ទី ១ ដល់ទី ៦"
                open={enrollmentOpen}
                onToggle={() => setEnrollmentOpen((v) => !v)}
              >
                <StudentEnrollmentTable
                  userId={user.uid}
                  academicYear={activeAcademicYear}
                  schoolName={activeSchoolName}
                  onTotalsChange={handleEnrollmentTotals}
                />
              </CollapsiblePanel>

              <CollapsiblePanel
                id="panel-disabled"
                title="២.(ខ១) សិស្សពិការ សិស្សជួបការលំបាកផ្នែកសុខភាព និងសិស្សជួបការលំបាក"
                subtitle="បែងចែកតាមប្រភេទ និងកម្រិតថ្នាក់ (កម្រិតទាប មធ្យម ខ្ពស់ ចម្រុះ និងថ្នាក់ទី ១-៦)"
                open={disabledOpen}
                onToggle={() => setDisabledOpen((v) => !v)}
              >
                <DisabledStudentsTable
                  userId={user.uid}
                  academicYear={activeAcademicYear}
                  schoolName={activeSchoolName}
                  onTotalsChange={handleSpecialNeedsTotals}
                />
              </CollapsiblePanel>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>ប្រព័ន្ធគ្រប់គ្រងស្ថិតិសិស្សបឋមសិក្សា</span>
          <span>ទិន្នន័យរក្សាទុកដោយសុវត្ថិភាពតាមគណនី Firebase</span>
        </div>
      </footer>

      {user && (
        <SchoolSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          schoolName={activeSchoolName}
          academicYear={activeAcademicYear}
          email={user.email || ''}
          displayName={profile?.displayName || user.displayName || ''}
          onSave={updateProfileSettings}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RegistryWorkspace />
      </AuthProvider>
    </ErrorBoundary>
  );
}
