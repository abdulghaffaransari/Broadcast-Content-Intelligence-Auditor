'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { getAuditHistory, saveAuditHistory, setViewAudit, setPrefillUrl, getLastDashboardResult, urlsMatch, type HistoryEntry } from '@/lib/history';
import { format } from 'date-fns';
import { FileVideo, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const raw = getAuditHistory();
    const last = getLastDashboardResult();
    const enriched = raw.map((e) => {
      if (e.fullResult) return e;
      if (last && urlsMatch(last.videoUrl, e.videoUrl)) {
        return { ...e, fullResult: last.result };
      }
      return e;
    });
    const anyEnriched = enriched.some((e, i) => e.fullResult && !raw[i]?.fullResult);
    if (anyEnriched) saveAuditHistory(enriched);
    setEntries(enriched);
  }, []);

  const handleOpenOnDashboard = (entry: HistoryEntry) => {
    if (entry.fullResult) {
      setViewAudit(entry.fullResult, entry.videoUrl);
      router.push('/');
      return;
    }
    const last = getLastDashboardResult();
    if (last && urlsMatch(last.videoUrl, entry.videoUrl)) {
      setViewAudit(last.result, last.videoUrl);
      router.push('/');
      return;
    }
    setPrefillUrl(entry.videoUrl);
    router.push('/');
  };

  return (
    <>
      <TopBar title="Audit History" subtitle="Previously reviewed videos" />
      <div className="flex-1 overflow-auto p-6">
        <p className="text-sm text-slate-400 mb-4">
          Recent audits (stored in this browser). Click an entry to open it on the Audit Dashboard.
        </p>
        {entries.length === 0 ? (
          <div className="rounded-lg bg-slate-800 border border-slate-700 p-8 text-center text-slate-500">
            No audit history yet. Run an audit from the dashboard.
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry, i) => (
              <li
                key={entry.sessionId + i}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenOnDashboard(entry)}
                onKeyDown={(e) => e.key === 'Enter' && handleOpenOnDashboard(entry)}
                className="rounded-lg border border-slate-700 bg-slate-800 p-4 flex flex-wrap items-center gap-4 transition-colors hover:bg-slate-700 hover:border-slate-600 cursor-pointer"
              >
                <FileVideo className="w-5 h-5 text-slate-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-200 truncate">{entry.videoUrl}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {entry.videoId} · {format(new Date(entry.createdAt), 'PPp')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {entry.status === 'PASS' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={entry.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'}>{entry.status}</span>
                </div>
                {entry.overallRiskScore != null && (
                  <span className="text-sm text-slate-400">Risk: {entry.overallRiskScore}/100</span>
                )}
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" /> Open on dashboard
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
