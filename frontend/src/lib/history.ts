import type { AuditResponse } from '@/lib/api';

const STORAGE_KEY = 'bci-audit-history';
const LAST_RESULT_KEY = 'bci-last-dashboard-result';
const VIEW_AUDIT_KEY = 'bci-view-audit';
const PREFILL_URL_KEY = 'bci-prefill-url';

export type HistoryEntry = {
  jobId?: string;
  sessionId: string;
  videoId: string;
  videoUrl: string;
  status: string;
  overallRiskScore?: number;
  createdAt: string;
  /** Full audit result for opening from history (optional for older entries) */
  fullResult?: AuditResponse;
};

export function getAuditHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Save history list (e.g. after enriching entries with fullResult from last run) */
export function saveAuditHistory(list: HistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = list.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

/** Normalize URL for matching (trim, lowercase host, no trailing slash) */
function normalizeUrl(url: string): string {
  try {
    const u = url.trim();
    if (!u) return u;
    const parsed = new URL(u);
    parsed.searchParams.sort();
    let path = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin}${path}${parsed.search}`;
  } catch {
    return url.trim();
  }
}

export function urlsMatch(a: string, b: string): boolean {
  return normalizeUrl(a) === normalizeUrl(b);
}

export function addToHistory(entry: HistoryEntry): void {
  const list = getAuditHistory();
  list.unshift(entry);
  // Backfill fullResult into older entries with same URL so clicking them shows full dashboard
  if (entry.fullResult) {
    const normalized = normalizeUrl(entry.videoUrl);
    for (let i = 1; i < list.length; i++) {
      if (!list[i].fullResult && normalizeUrl(list[i].videoUrl) === normalized) {
        list[i] = { ...list[i], fullResult: entry.fullResult };
      }
    }
  }
  const trimmed = list.slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/** Save the current dashboard result so it persists when navigating away */
export function saveLastDashboardResult(result: AuditResponse, videoUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ result, videoUrl }));
  } catch {
    // ignore quota or parse errors
  }
}

/** Restore last dashboard result (e.g. when returning from History) */
export function getLastDashboardResult(): { result: AuditResponse; videoUrl: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_RESULT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Set audit to view on dashboard (called when user clicks a history entry) */
export function setViewAudit(result: AuditResponse, videoUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VIEW_AUDIT_KEY, JSON.stringify({ result, videoUrl }));
  } catch {
    // ignore
  }
}

/** Get and clear the "view this audit" payload (dashboard reads this on mount) */
export function consumeViewAudit(): { result: AuditResponse; videoUrl: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(VIEW_AUDIT_KEY);
    localStorage.removeItem(VIEW_AUDIT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Set URL to prefill on dashboard (when opening an old history entry without full result) */
export function setPrefillUrl(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFILL_URL_KEY, url);
  } catch {
    // ignore
  }
}

/** Get and clear the prefill URL (dashboard reads this on mount) */
export function consumePrefillUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = localStorage.getItem(PREFILL_URL_KEY);
    localStorage.removeItem(PREFILL_URL_KEY);
    return url;
  } catch {
    return null;
  }
}
