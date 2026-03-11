'use client';

import { useState, useCallback, useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import {
  UrlInput,
  StatusTracker,
  VideoPlayer,
  RiskVerdictCard,
  SectionCard,
  EvidencePanel,
  Recommendations,
  PositiveFindings,
  ExportDropdown,
} from '@/components/dashboard';
import { startAudit, getJobStatus, getJobResult, type AuditResponse, type AuditJobStarted } from '@/lib/api';
import { addToHistory, saveLastDashboardResult, getLastDashboardResult, consumeViewAudit, consumePrefillUrl } from '@/lib/history';

const POLL_INTERVAL_MS = 2000;

export default function DashboardPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [statusLabel, setStatusLabel] = useState<string>('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState(0);

  // Restore last result when returning from History, or load audit from history click, or prefill URL
  useEffect(() => {
    const view = consumeViewAudit();
    if (view) {
      setVideoUrl(view.videoUrl);
      setResult(view.result);
      setStatus('success');
      setStatusLabel('Audit complete');
      setError(null);
      return;
    }
    const last = getLastDashboardResult();
    if (last) {
      setVideoUrl(last.videoUrl);
      setResult(last.result);
      setStatus('success');
      setStatusLabel('Audit complete');
      setError(null);
      return;
    }
    const prefill = consumePrefillUrl();
    if (prefill) {
      setVideoUrl(prefill);
      setResult(null);
      setStatus('idle');
      setStatusLabel('');
      setError(null);
    }
  }, []);

  const runSyncAudit = useCallback(async (url: string) => {
    setVideoUrl(url);
    setResult(null);
    setError(null);
    setStatus('running');
    setStatusLabel('Processing…');
    setProcessingStage(0);
    try {
      const data = await startAudit(url, false);
      const audit = data as AuditResponse;
      setResult(audit);
      setStatus('success');
      setStatusLabel('Audit complete');
      saveLastDashboardResult(audit, url);
      addToHistory({
        sessionId: audit.session_id,
        videoId: audit.video_id,
        videoUrl: url,
        status: audit.status,
        overallRiskScore: audit.overall_risk_score,
        createdAt: new Date().toISOString(),
        fullResult: audit,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audit failed');
      setStatus('error');
      setStatusLabel('Error');
    }
  }, []);

  const runAsyncAudit = useCallback(async (url: string) => {
    setVideoUrl(url);
    setResult(null);
    setError(null);
    setStatus('running');
    setStatusLabel('Job started');
    setProcessingStage(0);
    try {
      const data = await startAudit(url, true);
      const job = data as AuditJobStarted;
      if ('job_id' in job && job.job_id) {
        setJobId(job.job_id);
        const poll = async () => {
          try {
            const st = await getJobStatus(job.job_id);
            setStatusLabel(st.status === 'running' ? 'Running…' : st.status);
            if (st.status === 'running') setProcessingStage(1);
            if (st.status === 'completed') {
              const audit = await getJobResult(job.job_id);
              setResult(audit);
              setStatus('success');
              setStatusLabel('Audit complete');
              setJobId(null);
              saveLastDashboardResult(audit, url);
              addToHistory({
                jobId: job.job_id,
                sessionId: audit.session_id,
                videoId: audit.video_id,
                videoUrl: url,
                status: audit.status,
                overallRiskScore: audit.overall_risk_score,
                createdAt: new Date().toISOString(),
                fullResult: audit,
              });
              return;
            }
            if (st.status === 'failed') {
              setError(st.error || 'Job failed');
              setStatus('error');
              setStatusLabel('Failed');
              setJobId(null);
              return;
            }
            setTimeout(poll, POLL_INTERVAL_MS);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Poll failed');
            setStatus('error');
            setJobId(null);
          }
        };
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start job');
      setStatus('error');
      setStatusLabel('Error');
    }
  }, []);

  const handleStart = useCallback(
    (url: string, asyncMode: boolean) => {
      if (asyncMode) runAsyncAudit(url);
      else runSyncAudit(url);
    },
    [runSyncAudit, runAsyncAudit]
  );

  return (
    <>
      <TopBar
        title="Audit Dashboard"
        subtitle="Content compliance & brand safety review"
        status={status}
        statusLabel={statusLabel}
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <UrlInput onStart={handleStart} disabled={status === 'running'} defaultUrl={videoUrl} />

        {videoUrl && !result && status === 'idle' && (
          <div className="rounded-lg bg-slate-800 border border-slate-600 p-3 text-sm text-slate-400">
            Opened from history. Click <strong className="text-slate-300">Start Audit</strong> to run the audit and see the full report.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-red-400 text-sm">{error}</div>
        )}

        <StatusTracker status={status} currentStage={processingStage} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <VideoPlayer
              videoUrl={videoUrl}
              flaggedSegments={result?.flagged_segments_with_timestamps as Array<{
                start_time?: string;
                end_time?: string;
                category?: string;
                severity?: string;
                evidence?: string;
              }>}
            />
            <RiskVerdictCard
              overallRiskScore={result?.overall_risk_score}
              finalVerdict={result?.final_verdict}
              status={result?.status}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SectionCard title="Age rating assessment" data={result?.age_rating_assessment} />
              <SectionCard title="Brand safety assessment" data={result?.brand_safety_assessment} />
              <SectionCard title="Harmful content assessment" data={result?.harmful_content_assessment} />
              <SectionCard title="Accessibility & distribution" data={result?.accessibility_and_distribution_assessment} />
            </div>

            {result?.final_report && (
              <div className="rounded-lg bg-slate-800/50 border border-slate-600 flex flex-col min-h-0">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-4 pt-4 pb-2 shrink-0">Final audit report</p>
                <div className="flex-1 min-h-0 px-4 pb-4">
                  <pre className="h-[280px] text-sm text-slate-300 whitespace-pre-wrap font-sans overflow-y-auto overflow-x-hidden rounded border border-slate-600 bg-slate-900/80 p-3">
                    {result.final_report}
                  </pre>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <EvidencePanel executiveSummary={result?.executive_summary} complianceResults={result?.compliance_results} />
            <PositiveFindings items={result?.positive_findings} />
            <Recommendations items={result?.recommendations} />
            <ExportDropdown result={result} disabled={!result} />
          </div>
        </div>
      </div>
    </>
  );
}
