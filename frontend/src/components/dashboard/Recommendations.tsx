'use client';

import { Lightbulb } from 'lucide-react';

type RecommendationsProps = {
  items?: string[];
};

export function Recommendations({ items = [] }: RecommendationsProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 p-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Lightbulb className="w-4 h-4" />
        Recommendations
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-300 flex gap-2">
            <span className="text-emerald-500/80">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
