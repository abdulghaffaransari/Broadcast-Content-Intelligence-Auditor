'use client';

import { useMemo } from 'react';

function getYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) return u.searchParams.get('v');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    return null;
  } catch {
    return null;
  }
}

type VideoPlayerProps = {
  videoUrl: string | null;
  flaggedSegments?: Array<{ start_time?: string; end_time?: string; category?: string; severity?: string; evidence?: string }>;
  onSeek?: (seconds: number) => void;
};

export function VideoPlayer({ videoUrl, flaggedSegments = [], onSeek }: VideoPlayerProps) {
  const videoId = useMemo(() => (videoUrl ? getYouTubeVideoId(videoUrl) : null), [videoUrl]);

  const parseTimestamp = (t: string | undefined): number => {
    if (!t) return 0;
    const parts = String(t).split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parseInt(parts[0] as unknown as string, 10) || 0;
  };

  if (!videoId) {
    return (
      <div className="rounded-lg bg-slate-800 border border-slate-700 aspect-video flex items-center justify-center text-slate-500">
        Enter a YouTube URL and run an audit to see the video.
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
      <div className="aspect-video relative">
        <iframe
          title="Video preview"
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
      {flaggedSegments.length > 0 && (
        <div className="p-3 border-t border-slate-700">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Flagged timestamps (click to seek)</p>
          <ul className="space-y-1.5 max-h-32 overflow-y-auto">
            {flaggedSegments.map((seg, i) => {
              const start = seg.start_time;
              const sec = parseTimestamp(start);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onSeek?.(sec)}
                    className="text-left w-full px-2 py-1.5 rounded bg-slate-700/50 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    <span className="font-mono text-amber-400">{start ?? '?'}</span>
                    {' — '}
                    <span className="text-slate-400">{seg.category ?? 'Issue'}</span>
                    {seg.severity && <span className="ml-1 text-red-400/80">({seg.severity})</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
