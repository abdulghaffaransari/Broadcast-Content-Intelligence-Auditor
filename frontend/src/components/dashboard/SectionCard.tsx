'use client';

type SectionData = {
  score?: string | number;
  summary?: string;
  findings?: Array<{ severity?: string; category?: string; description?: string; evidence?: string }>;
};

type SectionCardProps = {
  title: string;
  data: SectionData | Record<string, unknown> | null | undefined;
};

export function SectionCard({ title, data }: SectionCardProps) {
  if (!data || typeof data !== 'object') return null;

  const d = data as SectionData;
  const score = d.score ?? 'N/A';
  const summary = d.summary ?? '—';
  const findings = Array.isArray(d.findings) ? d.findings : [];

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 p-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      <p className="text-sm text-slate-300 mb-2">
        <span className="text-slate-500">Score:</span> {String(score)}
      </p>
      <p className="text-sm text-slate-300 mb-3">{summary}</p>
      {findings.length > 0 && (
        <ul className="space-y-1.5">
          {findings.map((f, i) => (
            <li key={i} className="text-sm text-slate-400 border-l-2 border-slate-600 pl-2">
              <span className="text-amber-400/90">[{f.severity ?? 'N/A'}]</span> {f.category ?? 'General'}: {f.description ?? '—'}
              {f.evidence && <span className="block text-slate-500 mt-0.5">Evidence: {f.evidence}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
