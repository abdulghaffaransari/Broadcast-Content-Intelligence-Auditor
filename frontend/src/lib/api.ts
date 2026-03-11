const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type ComplianceIssue = {
  category: string;
  severity: string;
  description: string;
  timestamp?: string;
};

export type AuditResponse = {
  session_id: string;
  video_id: string;
  status: string;
  final_report: string;
  compliance_results: ComplianceIssue[];
  overall_risk_score?: number;
  final_verdict?: string;
  executive_summary?: string;
  age_rating_assessment?: Record<string, unknown>;
  brand_safety_assessment?: Record<string, unknown>;
  harmful_content_assessment?: Record<string, unknown>;
  accessibility_and_distribution_assessment?: Record<string, unknown>;
  positive_findings?: string[];
  flagged_segments_with_timestamps?: Array<Record<string, unknown>>;
  recommendations?: string[];
};

export type JobStatusResponse = {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
  error?: string;
};

export type AuditJobStarted = {
  job_id: string;
  status: string;
  message: string;
};

export async function startAudit(videoUrl: string, asyncMode: boolean): Promise<AuditResponse | AuditJobStarted> {
  const res = await fetch(`${API_BASE}/audit?async_mode=${asyncMode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_url: videoUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail));
  }
  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/audit/jobs/${jobId}/status`);
  if (!res.ok) throw new Error('Job not found');
  return res.json();
}

export async function getJobResult(jobId: string): Promise<AuditResponse> {
  const res = await fetch(`${API_BASE}/audit/jobs/${jobId}/result`);
  if (res.status === 202) {
    const d = await res.json();
    throw new Error(d.detail?.message || 'Job not yet completed');
  }
  if (res.status === 422) {
    const d = await res.json();
    throw new Error(d.detail?.error || 'Job failed');
  }
  if (!res.ok) throw new Error('Failed to fetch result');
  return res.json();
}

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('API unavailable');
  return res.json();
}
