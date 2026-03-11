'use client';

import type { ComplianceIssue } from '@/lib/api';
import { FileText, ListChecks } from 'lucide-react';

type EvidencePanelProps = {
  executiveSummary?: string;
  complianceResults?: ComplianceIssue[];
};

export function EvidencePanel({ executiveSummary, complianceResults = [] }: EvidencePanelProps) {
  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 p-4 h-full flex flex-col min-h-0">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Evidence & findings</p>
      <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
        {executiveSummary && (
          <div>
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Executive summary</span>
            </div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{executiveSummary}</p>
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <ListChecks className="w-4 h-4" />
            <span className="text-sm font-medium">Matched findings</span>
          </div>
          {complianceResults.length === 0 ? (
            <p className="text-sm text-slate-500">No compliance findings listed.</p>
          ) : (
            <ul className="space-y-1.5">
              {complianceResults.map((r, i) => (
                <li key={i} className="text-sm text-slate-300 border-l-2 border-slate-600 pl-2">
                  <span className="text-amber-400/90">[{r.severity}]</span> {r.category}: {r.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
