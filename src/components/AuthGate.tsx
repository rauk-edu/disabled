import { AlertCircle, LogIn, ShieldCheck } from 'lucide-react';

interface AuthGateProps {
  signingIn: boolean;
  authError: string | null;
  onSignIn: () => Promise<void>;
}

export function AuthGate({ signingIn, authError, onSignIn }: AuthGateProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl p-8">
        <div className="flex items-center gap-2.5 text-xs text-slate-500 mb-3">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
          <span>ប្រព័ន្ធគ្រប់គ្រងស្ថិតិសិស្ស</span>
          <span aria-hidden="true">·</span>
          <span>Firebase Authentication &amp; Cloud Firestore</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 leading-snug text-balance">
          ចូលប្រើប្រាស់ប្រព័ន្ធស្ថិតិសិស្សបឋមសិក្សា
        </h1>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          សូមចូលប្រើប្រាស់ដោយគណនី Google របស់អ្នក ដើម្បីកត់ត្រា ទាញយក និងរក្សាទុកទិន្នន័យតារាង
          ២.(ក២) សិស្សថ្មី/ឡើងថ្នាក់/ត្រួតថ្នាក់ និងតារាង ២.(ខ១) សិស្សពិការ និងសិស្សជួបការលំបាក
          ដោយសុវត្ថិភាពក្នុង Cloud Firestore។
        </p>

        <div className="mt-6 border-t border-slate-200 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-900">តារាង ២.(ក២)</p>
            <p className="mt-1">
              ស្ថិតិសិស្សថ្មី សិស្សឡើងថ្នាក់ និងសិស្សត្រួតថ្នាក់ តាមអាយុ ៦ ដល់ ១៥+ ឆ្នាំ និងថ្នាក់ទី ១ ដល់ទី ៦។
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">តារាង ២.(ខ១)</p>
            <p className="mt-1">
              ស្ថិតិសិស្សពិការ សិស្សជួបការលំបាកផ្នែកសុខភាព សិស្សជួបការលំបាក និងកិច្ចអន្តរាគមន៍។
            </p>
          </div>
        </div>

        {authError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="break-words">{authError}</span>
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={onSignIn}
            disabled={signingIn}
            className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogIn className="w-4 h-4" />
            {signingIn ? 'កំពុងភ្ជាប់គណនី Google...' : 'ចូលប្រើប្រាស់ដោយ Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
