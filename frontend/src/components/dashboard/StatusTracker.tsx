'use client';

import { Download, Database, Search, FileText, CheckCircle, Circle } from 'lucide-react';

const STAGES = [
  { key: 'download', label: 'Download & index', icon: Download },
  { key: 'indexing', label: 'Indexing', icon: Database },
  { key: 'retrieval', label: 'Retrieval', icon: Search },
  { key: 'report', label: 'Report generation', icon: FileText },
] as const;

type StatusTrackerProps = {
  status: 'idle' | 'running' | 'success' | 'error';
  currentStage?: number; // 0..3, optional for simplicity
};

export function StatusTracker({ status, currentStage = 0 }: StatusTrackerProps) {
  if (status === 'idle') return null;

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 p-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Processing status</p>
      <div className="flex justify-between gap-2">
        {STAGES.map(({ key, label, icon: Icon }, i) => {
          const done = status === 'success' || (status === 'running' && i < currentStage);
          const active = status === 'running' && i === currentStage;
          return (
            <div key={key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  done ? 'bg-emerald-500/20 text-emerald-400' : active ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-500'
                }`}
              >
                {done ? <CheckCircle className="w-5 h-5" /> : active ? <Icon className="w-5 h-5 animate-pulse" /> : <Circle className="w-5 h-5" />}
              </div>
              <span className={`text-xs ${done || active ? 'text-slate-300' : 'text-slate-500'}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
