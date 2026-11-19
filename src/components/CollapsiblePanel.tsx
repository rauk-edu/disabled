import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsiblePanelProps {
  id?: string;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function CollapsiblePanel({
  id,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: CollapsiblePanelProps) {
  return (
    <section
      id={id}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-20"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 leading-snug">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white">
          {open ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      </button>

      <div className={open ? 'border-t border-slate-200 p-5' : 'hidden'}>
        {children}
      </div>
    </section>
  );
}
