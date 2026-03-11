'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';

type TopBarProps = {
  title: string;
  subtitle?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  statusLabel?: string;
};

export function TopBar({ title, subtitle, status, statusLabel }: TopBarProps) {
  return (
    <header className="shrink-0 h-14 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {status && status !== 'idle' && (
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            status === 'running'
              ? 'bg-amber-500/20 text-amber-400'
              : status === 'success'
                ? 'bg-emerald-500/20 text-emerald-400'
                : status === 'error'
                  ? 'bg-red-500/20 text-red-400'
                  : ''
          }`}
        >
          {status === 'running' && <AlertCircle className="w-4 h-4 animate-pulse" />}
          {status === 'success' && <CheckCircle className="w-4 h-4" />}
          {status === 'error' && <AlertCircle className="w-4 h-4" />}
          {statusLabel}
        </div>
      )}
    </header>
  );
}
