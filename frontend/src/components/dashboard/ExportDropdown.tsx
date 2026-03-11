'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileJson, FileCode } from 'lucide-react';
import type { AuditResponse } from '@/lib/api';

type ExportDropdownProps = {
  result: AuditResponse | null;
  disabled?: boolean;
};

export function ExportDropdown({ result, disabled }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!result) return null;

  const downloadTxt = () => {
    const blob = new Blob([result.final_report], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-${result.video_id}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    setOpen(false);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-${result.video_id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setOpen(false);
  };

  const downloadPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ format: 'a4' });
    const lines = doc.splitTextToSize(result.final_report, 170);
    doc.setFontSize(10);
    doc.text(lines, 20, 20);
    doc.save(`audit-${result.video_id}-${Date.now()}.pdf`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-medium transition-colors"
      >
        <Download className="w-4 h-4" />
        Export report
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 py-1 w-48 rounded-lg bg-slate-800 border border-slate-600 shadow-xl z-10">
          <button
            type="button"
            onClick={downloadTxt}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Download as .txt
          </button>
          <button
            type="button"
            onClick={downloadJson}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <FileJson className="w-4 h-4" />
            Download as JSON
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <FileCode className="w-4 h-4" />
            Download as PDF
          </button>
        </div>
      )}
    </div>
  );
}
