'use client';

import { AlertTriangle, CheckCircle, Shield } from 'lucide-react';

type RiskVerdictCardProps = {
  overallRiskScore?: number;
  finalVerdict?: string;
  status?: string;
};

export function RiskVerdictCard({ overallRiskScore = 0, finalVerdict = '—', status = '—' }: RiskVerdictCardProps) {
  const isPass = status === 'PASS';
  const isFail = status === 'FAIL';

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 p-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Risk & verdict</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-500" />
          <span className="text-2xl font-bold text-slate-100">{overallRiskScore}/100</span>
          <span className="text-sm text-slate-400">risk score</span>
        </div>
        <div className="flex items-center gap-2">
          {isPass && <CheckCircle className="w-5 h-5 text-emerald-400" />}
          {isFail && <AlertTriangle className="w-5 h-5 text-red-400" />}
          {!isPass && !isFail && <span className="w-5 h-5 rounded-full bg-slate-600" />}
          <span className={`font-semibold ${isPass ? 'text-emerald-400' : isFail ? 'text-red-400' : 'text-slate-400'}`}>
            {status}
          </span>
        </div>
        <div className="text-sm text-slate-400">
          Verdict: <span className="text-slate-200">{finalVerdict}</span>
        </div>
      </div>
    </div>
  );
}
