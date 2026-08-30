'use client';

import type { Node, Convoy, DemoLogEntry } from '../../lib/types';

export interface DispatchPanelProps {
  nodes: Node[];
  convoys: Convoy[];
  demoLog: DemoLogEntry[];
}

/**
 * Convoy has no persisted ETA field — routingEngine only emits ETA text
 * inside its logMessage strings. The most recent /demoLog entry tagged
 * with this convoy's id is the closest available source for it.
 */
function latestLogFor(convoyId: string, demoLog: DemoLogEntry[]): DemoLogEntry | undefined {
  let latest: DemoLogEntry | undefined;
  for (const entry of demoLog) {
    if (entry.convoyId !== convoyId) continue;
    if (!latest || entry.simTimeSec > latest.simTimeSec) latest = entry;
  }
  return latest;
}

/**
 * Status is checked first, explicitly. Log-message parsing (the only
 * source of ETA text — see latestLogFor's docstring) only applies to the
 * enroute/rerouted case; every other status has a direct, known label and
 * must never fall through to a stale ETA parsed from an old log entry.
 */
function statusDetailFor(convoy: Convoy, demoLog: DemoLogEntry[]): string {
  if (convoy.status === 'pending') {
    return 'Not yet deployed';
  }
  if (convoy.status === 'arrived') {
    return 'Arrived';
  }
  if (convoy.status === 'recalled') {
    const latest = latestLogFor(convoy.id, demoLog);
    return latest ? latest.message : 'Recalled';
  }
  // 'enroute' | 'rerouted'
  const latest = latestLogFor(convoy.id, demoLog);
  return latest ? `${convoy.status} — ${latest.message}` : convoy.status;
}

export default function DispatchPanelPlacard({ nodes, convoys, demoLog }: DispatchPanelProps) {
  const shelters = nodes
    .filter((node): node is Node & { criticalSupplyNeed: NonNullable<Node['criticalSupplyNeed']> } =>
      node.type === 'shelter' && node.criticalSupplyNeed !== undefined,
    )
    .sort((a, b) => a.criticalSupplyNeed.hoursOfStockRemaining - b.criticalSupplyNeed.hoursOfStockRemaining);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xs font-bold uppercase tracking-wider text-signal-accent">
        SHELTERS — PRIORITY SEQUENCE
      </h2>

      <div className="space-y-3">
        {shelters.map((shelter) => {
          const incoming = convoys.filter((c) => c.destNodeId === shelter.id);
          const hoursLeft = shelter.criticalSupplyNeed.hoursOfStockRemaining;
          
          // Determine status color based on stock hours left
          let statusColor = '#4B7B4E'; // Green: > 5h remaining
          let statusLabel = 'STABLE';
          let borderClass = 'border-l-status-ok';
          
          if (hoursLeft <= 3.0) {
            statusColor = '#A6403A'; // Rust Red: Critical
            statusLabel = 'CRITICAL';
            borderClass = 'border-l-status-danger';
          } else if (hoursLeft <= 5.0) {
            statusColor = '#B8863B'; // Amber Ochre: Degraded
            statusLabel = 'WARNING';
            borderClass = 'border-l-status-warn';
          }

          return (
            <div 
              key={shelter.id} 
              className={`relative overflow-hidden rounded-none border border-[#35332C] bg-[#24221D] p-3 pl-4 border-l-4 ${borderClass} transition-all duration-200 hover:bg-[#2C2A24]`}
            >
              {/* Header */}
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-sans text-xs font-semibold tracking-wide text-[#FAF9F6]">
                  {shelter.name.toUpperCase()}
                </span>
                <span className="font-mono text-sm font-bold tracking-tight text-white tabular-nums">
                  {hoursLeft.toFixed(1)}h <span className="text-[10px] text-[#E4E1D8]/70 font-normal">REMAINING</span>
                </span>
              </div>

              {/* Status Badge & details */}
              <div className="mt-2 flex items-center justify-between border-t border-[#35332C]/50 pt-2 text-[10px]">
                <span 
                  className="font-display font-semibold px-1 py-0.5" 
                  style={{ color: statusColor, backgroundColor: `${statusColor}20` }}
                >
                  {statusLabel}
                </span>
                
                {/* Micro supply details */}
                <span className="font-mono text-[#E4E1D8]/80">
                  F:{shelter.criticalSupplyNeed.food} W:{shelter.criticalSupplyNeed.water} I:{shelter.criticalSupplyNeed.insulin}
                </span>
              </div>

              {/* Incoming Convoys Section */}
              <div className="mt-2.5 space-y-1.5 border-t border-[#35332C]/40 pt-2">
                <span className="font-display text-[9px] font-bold tracking-widest text-[#E4E1D8]/60 uppercase">
                  Incoming Operations ({incoming.length})
                </span>
                
                {incoming.length === 0 ? (
                  <p className="font-sans text-[10px] italic text-[#E4E1D8]/50">
                    NO CONVOY EN ROUTE
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {incoming.map((convoy) => {
                      let convoyColorClass = 'text-signal-accent';
                      if (convoy.status === 'enroute') convoyColorClass = 'text-status-ok';
                      if (convoy.status === 'rerouted') convoyColorClass = 'text-status-warn';
                      if (convoy.status === 'recalled') convoyColorClass = 'text-status-danger';

                      return (
                        <li 
                          key={convoy.id} 
                          className="font-mono text-[10px] leading-tight text-[#FAF9F6] border-l border-[#35332C] pl-1.5"
                        >
                          <span className={`font-bold ${convoyColorClass}`}>{convoy.id}</span>
                          <span className="text-[#E4E1D8]/60"> [{convoy.cargoType.toUpperCase()}]</span>
                          <span className="text-[#E4E1D8]/80"> — {statusDetailFor(convoy, demoLog)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
