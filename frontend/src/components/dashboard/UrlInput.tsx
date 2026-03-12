'use client';

import { useState, useEffect } from 'react';
import { Play, Loader2 } from 'lucide-react';

type UrlInputProps = {
  onStart: (url: string, asyncMode: boolean) => void;
  disabled?: boolean;
  /** Prefilled URL (e.g. when opening from history without saved report) */
  defaultUrl?: string | null;
};

export function UrlInput({ onStart, disabled, defaultUrl }: UrlInputProps) {
  const [url, setUrl] = useState(defaultUrl ?? '');
  const [asyncMode, setAsyncMode] = useState(true);

  useEffect(() => {
    if (defaultUrl != null) setUrl(defaultUrl);
  }, [defaultUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = url.trim();
    if (u) onStart(u, asyncMode);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
      <div className="flex-1 min-w-0">
        <label htmlFor="video-url" className="block text-xs font-medium text-slate-400 mb-1">
          Video URL (YouTube)
        </label>
        <input
          id="video-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none"
          disabled={disabled}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          checked={asyncMode}
          onChange={(e) => setAsyncMode(e.target.checked)}
          className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
        />
        Run in background (async)
      </label>
      <button
        type="submit"
        disabled={disabled || !url.trim()}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        Start Audit
      </button>
    </form>
  );
}
