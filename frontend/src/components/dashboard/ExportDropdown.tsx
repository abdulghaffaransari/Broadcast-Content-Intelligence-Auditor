'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, FileJson, FileCode } from 'lucide-react';
import type { AuditResponse } from '@/lib/api';

type ExportDropdownProps = {
  result: AuditResponse | null;
  disabled?: boolean;
};

export function ExportDropdown({ result, disabled }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuW = 208;
    const menuH = 132; // ~3 options so dropdown fits in viewport
    const gap = 4;
    const padding = 8;
    let left = rect.right - menuW;
    if (left < padding) left = padding;
    if (left + menuW > window.innerWidth - padding) left = window.innerWidth - menuW - padding;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const openAbove = spaceBelow < menuH;
    const top = openAbove ? rect.top - menuH - gap : rect.bottom + gap;
    setMenuRect({ top, left });
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      const menu = document.getElementById('export-report-menu');
      if (menu?.contains(target)) return;
      setOpen(false);
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
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const pageW = 210;
    const pageH = 297;
    const margin = 16;
    const footerH = 12;
    const contentBottom = pageH - footerH;
    let y = 20;
    const lineH = 5;
    const sectionGap = 8;

    const drawFooterOnCurrentPage = () => {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Broadcast Content Intelligence Auditor — Confidential', margin, pageH - 8);
      doc.setTextColor(0, 0, 0);
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > contentBottom) {
        drawFooterOnCurrentPage();
        doc.addPage();
        y = 20;
      }
    };

    const addSection = (title: string, fillR: number, fillG: number, fillB: number) => {
      ensureSpace(18);
      doc.setFillColor(fillR, fillG, fillB);
      doc.rect(0, y - 4, pageW, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, y + 5);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      y += sectionGap + 8;
    };

    const addText = (text: string, fontSize = 9) => {
      ensureSpace(lineH * 3);
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, pageW - 2 * margin) as string[];
      for (const line of lines) {
        ensureSpace(lineH);
        doc.text(line, margin, y);
        y += lineH;
      }
      y += 2;
    };

    const addBullets = (items: string[] | undefined) => {
      if (!items?.length) return;
      items.forEach((item) => {
        const lines = doc.splitTextToSize(`• ${item}`, pageW - 2 * margin - 6) as string[];
        lines.forEach((line: string) => {
          ensureSpace(lineH);
          doc.text(line, margin + 5, y);
          y += lineH;
        });
        y += 1;
      });
      y += 2;
    };

    // —— Cover / Title block ——
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Broadcast Content Intelligence', margin, 12);
    doc.setFontSize(14);
    doc.text('Audit Report', margin, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Video ID: ${result.video_id}  •  Generated: ${new Date().toISOString().slice(0, 19)} UTC`, margin, 26);
    doc.setTextColor(0, 0, 0);
    y = 34;

    // —— Risk & Verdict (prominent colored box) ——
    addSection('RISK & VERDICT', 30, 64, 175);
    const isPass = (result.final_verdict ?? '').toUpperCase().includes('LOW') || result.status === 'PASS';
    doc.setFillColor(isPass ? 22 : 185, isPass ? 163 : 28, isPass ? 74 : 28);
    doc.rect(margin, y, pageW - 2 * margin, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Risk Score: ${result.overall_risk_score ?? 0}/100  •  Verdict: ${result.final_verdict ?? '—'}  •  Status: ${result.status}`, margin + 4, y + 11);
    doc.setTextColor(0, 0, 0);
    y += 22;

    // —— Executive Summary ——
    addSection('EXECUTIVE SUMMARY', 51, 65, 85);
    addText(result.executive_summary ?? '—', 9);

    // —— Section 1: Age Rating ——
    addSection('1. AGE RATING ASSESSMENT', 59, 130, 246);
    const age = result.age_rating_assessment as { score?: string; summary?: string; findings?: unknown[] } | undefined;
    if (age) {
      addText(`Score: ${age.score ?? 'N/A'}  •  Summary: ${age.summary ?? '—'}`, 9);
      if (Array.isArray(age.findings) && age.findings.length) {
        age.findings.forEach((f: unknown) => {
          const x = f as { severity?: string; category?: string; description?: string };
          addText(`[${x.severity ?? 'N/A'}] ${x.category ?? 'General'}: ${x.description ?? '—'}`, 9);
        });
      }
    } else addText('—');
    y += 2;

    // —— Section 2: Brand Safety ——
    addSection('2. BRAND SAFETY ASSESSMENT', 99, 102, 241);
    const brand = result.brand_safety_assessment as { score?: string; summary?: string; findings?: unknown[] } | undefined;
    if (brand) {
      addText(`Score: ${brand.score ?? 'N/A'}  •  Summary: ${brand.summary ?? '—'}`, 9);
      if (Array.isArray(brand.findings) && brand.findings.length) {
        brand.findings.forEach((f: unknown) => {
          const x = f as { severity?: string; category?: string; description?: string };
          addText(`[${x.severity ?? 'N/A'}] ${x.category ?? 'General'}: ${x.description ?? '—'}`, 9);
        });
      }
    } else addText('—');
    y += 2;

    // —— Section 3: Harmful Content ——
    addSection('3. HARMFUL CONTENT ASSESSMENT', 194, 65, 153);
    const harmful = result.harmful_content_assessment as { score?: string; summary?: string; findings?: unknown[] } | undefined;
    if (harmful) {
      addText(`Score: ${harmful.score ?? 'N/A'}  •  Summary: ${harmful.summary ?? '—'}`, 9);
      if (Array.isArray(harmful.findings) && harmful.findings.length) {
        harmful.findings.forEach((f: unknown) => {
          const x = f as { severity?: string; category?: string; description?: string };
          addText(`[${x.severity ?? 'N/A'}] ${x.category ?? 'General'}: ${x.description ?? '—'}`, 9);
        });
      }
    } else addText('—');
    y += 2;

    // —— Section 4: Accessibility ——
    addSection('4. ACCESSIBILITY & DISTRIBUTION', 21, 94, 117);
    const acc = result.accessibility_and_distribution_assessment as { score?: string; summary?: string } | undefined;
    if (acc) addText(`Score: ${acc.score ?? 'N/A'}  •  Summary: ${acc.summary ?? '—'}`, 9);
    else addText('—');
    y += 2;

    // —— Positive Findings (green accent) ——
    addSection('5. POSITIVE FINDINGS', 22, 163, 115);
    doc.setTextColor(21, 128, 61);
    addBullets(result.positive_findings);
    doc.setTextColor(0, 0, 0);

    // —— Flagged Segments (amber) ——
    addSection('6. FLAGGED SEGMENTS (TIMESTAMPS)', 217, 119, 6);
    const segments = result.flagged_segments_with_timestamps as Array<{ start_time?: string; end_time?: string; category?: string; severity?: string; evidence?: string }> | undefined;
    if (segments?.length) {
      segments.forEach((seg) => {
        addText(`[${seg.start_time ?? '?'} – ${seg.end_time ?? '?'}] ${seg.category ?? 'General'} (${seg.severity ?? 'N/A'})`, 9);
        if (seg.evidence) addText(`Evidence: ${seg.evidence}`, 8);
      });
    } else addText('None identified.');
    y += 2;

    // —— Recommendations ——
    addSection('7. RECOMMENDATIONS', 30, 58, 138);
    addBullets(result.recommendations);
    if (!result.recommendations?.length) addText('None generated.');

    drawFooterOnCurrentPage();

    doc.save(`audit-${result.video_id}-${Date.now()}.pdf`);
    setOpen(false);
  };

  const menuEl = open && typeof document !== 'undefined' && (
    <div
      id="export-report-menu"
      className="fixed py-1 w-52 rounded-lg bg-slate-800 border border-slate-600 shadow-xl z-[9999]"
      style={{ top: menuRect.top, left: menuRect.left }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        onClick={downloadTxt}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors rounded-t-lg"
      >
        <FileText className="w-4 h-4 shrink-0" />
        Download as .txt
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={downloadJson}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors"
      >
        <FileJson className="w-4 h-4 shrink-0" />
        Download as JSON
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={downloadPdf}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors rounded-b-lg"
      >
        <FileCode className="w-4 h-4 shrink-0" />
        Download as PDF
      </button>
    </div>
  );

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-medium transition-colors"
      >
        <Download className="w-4 h-4 shrink-0" />
        Export report
      </button>
      {typeof document !== 'undefined' && menuEl && createPortal(menuEl, document.body)}
    </div>
  );
}
