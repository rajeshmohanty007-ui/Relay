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

export default function DispatchPanel({ nodes, convoys, demoLog }: DispatchPanelProps) {
  const shelters = nodes
    .filter((node): node is Node & { criticalSupplyNeed: NonNullable<Node['criticalSupplyNeed']> } =>
      node.type === 'shelter' && node.criticalSupplyNeed !== undefined,
    )
    .sort((a, b) => a.criticalSupplyNeed.hoursOfStockRemaining - b.criticalSupplyNeed.hoursOfStockRemaining);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Shelters — Most At-Risk First
      </h2>

      {shelters.map((shelter) => {
        const incoming = convoys.filter((c) => c.destNodeId === shelter.id);

        return (
          <div key={shelter.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{shelter.name}</span>
              <span className="whitespace-nowrap text-sm font-semibold text-red-600">
                {shelter.criticalSupplyNeed.hoursOfStockRemaining.toFixed(1)}h left
              </span>
            </div>

            {incoming.length === 0 ? (
              <p className="mt-1 text-xs text-zinc-400">No convoy en route</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {incoming.map((convoy) => (
                  <li key={convoy.id} className="text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium">{convoy.id}</span> ({convoy.cargoType}) —{' '}
                    {statusDetailFor(convoy, demoLog)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
