'use client';

import type { DemoLogEntry } from '../lib/types';

export interface EventFeedProps {
  entries: DemoLogEntry[];
  loading?: boolean;
}

/**
 * Categorize the message to determine its status dot color
 */
function getEventColor(message: string): string {
  const msg = message.toLowerCase();
  
  // Danger/Block/Recall
  if (msg.includes('block') || msg.includes('recall') || msg.includes('danger') || msg.includes('closed') || msg.includes('severed')) {
    return '#C6423B'; // Red
  }
  
  // Degraded/Reroute
  if (msg.includes('degrad') || msg.includes('rerout') || msg.includes('watch') || msg.includes('warning') || msg.includes('congested')) {
    return '#E8A33D'; // Amber
  }
  
  // Success/Arrival/Deploy
  if (msg.includes('arrive') || msg.includes('clear') || msg.includes('safe') || msg.includes('success') || msg.includes('deploy') || msg.includes('start')) {
    return '#4CAF6D'; // Green
  }
  
  // Other/System
  return '#4FB3BF'; // Signal Accent (cyan)
}

export default function EventFeedDispatcher({ entries, loading }: EventFeedProps) {
  const newestFirst = [...entries].sort((a, b) => b.simTimeSec - a.simTimeSec);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs font-bold uppercase tracking-wider text-signal-accent">
          DISPATCHER FLIGHT LOG
        </h2>
        {loading && (
          <span className="font-mono text-[9px] text-zinc-500 animate-pulse">
            SYNCING LIVE...
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 border border-struct-line bg-[#080C10] p-2">
        {!loading && newestFirst.length === 0 ? (
          <p className="font-mono text-[10px] text-zinc-500 italic p-2">
            NO LOG ENTRIES RECORDED
          </p>
        ) : (
          <ul className="h-full space-y-1.5 overflow-y-auto pr-1">
            {newestFirst.map((entry) => {
              const dotColor = getEventColor(entry.message);
              return (
                <li 
                  key={entry.id} 
                  className="flex items-start gap-2 border-b border-struct-line/20 pb-1.5 font-mono text-[10px] text-zinc-300"
                >
                  {/* Timestamp */}
                  <span className="shrink-0 font-bold text-zinc-500 tracking-tight select-none">
                    t={entry.simTimeSec.toString().padStart(4, '0')}s
                  </span>
                  
                  {/* Status Indicator Dot */}
                  <span className="mt-1 shrink-0 flex items-center justify-center">
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ 
                        backgroundColor: dotColor, 
                        boxShadow: `0 0 4px ${dotColor}aa` 
                      }} 
                    />
                  </span>
                  
                  {/* Log Content */}
                  <span className="flex-1 leading-normal tracking-wide text-zinc-200">
                    {entry.message}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
