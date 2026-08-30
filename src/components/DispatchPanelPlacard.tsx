'use client';

import type { Node, Convoy, DemoLogEntry } from '../lib/types';

export interface DispatchPanelProps {
  nodes: Node[];
  convoys: Convoy[];
  demoLog: DemoLogEntry[];
}






function latestLogFor(convoyId: string, demoLog: DemoLogEntry[]): DemoLogEntry | undefined {
  let latest: DemoLogEntry | undefined;
  for (const entry of demoLog) {
    if (entry.convoyId !== convoyId) continue;
    if (!latest || entry.simTimeSec > latest.simTimeSec) latest = entry;
  }
  return latest;
}







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
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs font-bold uppercase tracking-wider text-signal-accent">
          SHELTERS — PRIORITY SEQUENCE
        </h2>
        <span className="text-[9px] font-mono text-[#E4E1D8]/60 bg-[#24221D] px-2 py-0.5 rounded-full border border-[#35332C]">
          {shelters.length} MONITORED
        </span>
      </div>

      <div className="space-y-3">
        {shelters.map((shelter) => {
          const incoming = convoys.filter((c) => c.destNodeId === shelter.id);
          const hoursLeft = shelter.criticalSupplyNeed.hoursOfStockRemaining;

          
          let statusColor = '#4B7B4E'; 
          let statusLabel = 'STABLE';
          let borderClass = 'border-l-status-ok';
          let glowShadow = 'hover:shadow-[0_0_15px_rgba(75,123,78,0.15)]';

          if (hoursLeft <= 3.0) {
            statusColor = '#A6403A'; 
            statusLabel = 'CRITICAL';
            borderClass = 'border-l-status-danger';
            glowShadow = 'hover:shadow-[0_0_15px_rgba(166,64,58,0.2)]';
          } else if (hoursLeft <= 5.0) {
            statusColor = '#B8863B'; 
            statusLabel = 'WARNING';
            borderClass = 'border-l-status-warn';
            glowShadow = 'hover:shadow-[0_0_15px_rgba(184,134,59,0.15)]';
          }

          return (
            <div
              key={shelter.id}
              className={`relative overflow-hidden rounded-2xl border border-struct-line bg-base-cream p-3.5 pl-4 border-l-4 ${borderClass} transition-all duration-200 hover:bg-base-sand/40 ${glowShadow}`}
            >
              {}
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-sans text-xs font-semibold tracking-wide text-base-dark">
                  {shelter.name.toUpperCase()}
                </span>
                <span className="font-mono text-sm font-bold tracking-tight text-base-dark tabular-nums">
                  {hoursLeft.toFixed(1)}h <span className="text-[10px] text-base-dark/70 font-normal">REMAINING</span>
                </span>
              </div>

              {}
              <div className="mt-2.5 flex items-center justify-between border-t border-struct-line/50 pt-2 text-[10px]">
                <span
                  className="font-display font-semibold px-2 py-0.5 rounded-full text-[9px]"
                  style={{ color: statusColor, backgroundColor: `${statusColor}20`, border: `1px solid ${statusColor}40` }}
                >
                  {statusLabel}
                </span>

                {}
                <span className="font-mono text-base-dark/80 bg-base-sand px-2 py-0.5 rounded-full border border-struct-line/60 text-[9px]">
                  F:{shelter.criticalSupplyNeed.food} W:{shelter.criticalSupplyNeed.water} I:{shelter.criticalSupplyNeed.insulin}
                </span>
              </div>

              {}
              <div className="mt-2.5 space-y-1.5 border-t border-struct-line/40 pt-2">
                <span className="font-display text-[9px] font-bold tracking-widest text-base-dark/60 uppercase">
                  Incoming Operations ({incoming.length})
                </span>

                {incoming.length === 0 ? (
                  <p className="font-sans text-[10px] italic text-base-dark/50">
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
                          className="font-mono text-[10px] leading-tight text-base-dark bg-base-sand p-1.5 rounded-xl border border-struct-line/60 flex items-center justify-between"
                        >
                          <div>
                            <span className={`font-bold ${convoyColorClass}`}>{convoy.id}</span>
                            <span className="text-base-dark/60"> [{convoy.cargoType.toUpperCase()}]</span>
                          </div>
                          <span className="text-base-dark/80 text-[9px] truncate max-w-[140px]">
                            {statusDetailFor(convoy, demoLog)}
                          </span>
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
