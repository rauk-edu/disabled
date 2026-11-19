import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  detail: string | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', detail: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let parsedMessage = error.message || 'មានបញ្ហាបច្ចេកទេសកើតឡើង។';
    let detail: string | null = null;

    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === 'object' && 'error' in parsed) {
        parsedMessage = String(parsed.error);
        detail = `${String(parsed.operationType || 'operation')} · ${String(parsed.path || '')}`;
      }
    } catch {
      // Plain error message
    }

    return {
      hasError: true,
      message: parsedMessage,
      detail,
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-900">
                  មានបញ្ហាក្នុងការដំណើរការទិន្នន័យ Firestore
                </h2>
                <p className="mt-1 text-sm text-slate-600 break-words">
                  {this.state.message}
                </p>
                {this.state.detail && (
                  <p className="mt-2 text-xs font-mono text-slate-500 break-all">
                    {this.state.detail}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  ផ្ទុកទំព័រឡើងវិញ
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
