'use client';

import type { DemoLogEntry } from '../lib/types';

export interface EventFeedProps {
  entries: DemoLogEntry[];
  loading?: boolean;
}




function getEventColor(message: string): string {
  const msg = message.toLowerCase();

  
  if (msg.includes('block') || msg.includes('recall') || msg.includes('danger') || msg.includes('closed') || msg.includes('severed')) {
    return '#997460'; 
  }

  
  if (msg.includes('degrad') || msg.includes('rerout') || msg.includes('watch') || msg.includes('warning') || msg.includes('congested')) {
    return '#6AADAB'; 
  }

  
  if (msg.includes('arrive') || msg.includes('clear') || msg.includes('safe') || msg.includes('success') || msg.includes('deploy') || msg.includes('start')) {
    return '#206E6B'; 
  }

  
  return '#206E6B'; 
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
          <span className="font-mono text-[9px] text-base-dark/60 animate-pulse bg-base-sand px-2 py-0.5 rounded-full border border-struct-line">
            SYNCING LIVE...
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 border border-struct-line bg-base-sand p-3 rounded-2xl shadow-inner">
        {!loading && newestFirst.length === 0 ? (
          <p className="font-mono text-[10px] text-base-dark/50 italic p-2">
            NO LOG ENTRIES RECORDED
          </p>
        ) : (
          <ul className="h-full space-y-2 overflow-y-auto pr-1">
            {newestFirst.map((entry) => {
              const dotColor = getEventColor(entry.message);
              return (
                <li
                  key={entry.id}
                  className="flex items-start gap-2.5 bg-base-cream border border-struct-line/60 p-2.5 rounded-xl font-mono text-[10px] text-base-dark transition-all hover:bg-base-sand"
                >
                  {}
                  <span className="shrink-0 font-bold text-base-dark bg-base-sand px-2 py-0.5 rounded-lg border border-struct-line tracking-tight select-none text-[9px]">
                    t={entry.simTimeSec.toString().padStart(4, '0')}s
                  </span>

                  {}
                  <span className="mt-1 shrink-0 flex items-center justify-center">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: dotColor,
                        boxShadow: `0 0 6px ${dotColor}aa`
                      }}
                    />
                  </span>

                  {}
                  <span className="flex-1 leading-normal tracking-wide text-base-dark">
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
