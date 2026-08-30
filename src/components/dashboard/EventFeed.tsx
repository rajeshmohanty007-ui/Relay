'use client';

import type { DemoLogEntry } from '../../lib/types';

export interface EventFeedProps {
  entries: DemoLogEntry[];
  loading?: boolean;
}

export default function EventFeed({ entries, loading }: EventFeedProps) {
  const newestFirst = [...entries].sort((a, b) => b.simTimeSec - a.simTimeSec);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Event Feed</h2>

      {loading && <p className="text-xs text-zinc-400">Loading...</p>}
      {!loading && newestFirst.length === 0 && <p className="text-xs text-zinc-400">No events yet</p>}

      <ul className="max-h-full space-y-1 overflow-y-auto">
        {newestFirst.map((entry) => (
          <li key={entry.id} className="border-b border-zinc-100 pb-1 text-xs dark:border-zinc-800">
            <span className="mr-2 font-mono text-zinc-400">t={entry.simTimeSec}s</span>
            {entry.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
