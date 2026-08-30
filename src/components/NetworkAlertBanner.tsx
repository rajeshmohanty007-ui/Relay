'use client';

import type { NetworkNode } from '../lib/networkConnectivity';

interface NetworkAlertBannerProps {
  nodes: NetworkNode[];
  onSelectNode: (node: NetworkNode) => void;
}

export default function NetworkAlertBanner({ nodes, onSelectNode }: NetworkAlertBannerProps) {
  const alertNodes = nodes.filter((n) => n.status === 'blackout' || n.status === 'critical_drop');

  if (alertNodes.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-semibold">Telecommunication Mesh Fully Resilient:</span>
          <span>Zero transmission blackouts across all 30 disaster response hubs and convoy corridors.</span>
        </div>
        <span className="font-mono text-[11px] opacity-75">All relays up</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/70 p-3 shadow-xs dark:border-red-900/50 dark:bg-red-950/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
            Telecommunication Outage & Blackout Alerts ({alertNodes.length} Stations Impacted)
          </h3>
        </div>
        <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
          Convoy Mesh Relay Degraded
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5">
        {alertNodes.map((node) => {
          const isBlackout = node.status === 'blackout';
          return (
            <button
              key={node.id}
              onClick={() => onSelectNode(node)}
              className={`flex shrink-0 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all hover:scale-[1.02] ${
                isBlackout
                  ? 'border-red-300 bg-red-100/80 text-red-900 shadow-sm dark:border-red-800 dark:bg-red-900/50 dark:text-red-100'
                  : 'border-orange-300 bg-orange-100/80 text-orange-900 shadow-sm dark:border-orange-800 dark:bg-orange-900/40 dark:text-orange-100'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold opacity-80">{node.code}</span>
                  <span
                    className={`rounded px-1 text-[9px] font-bold uppercase ${
                      isBlackout ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                    }`}
                  >
                    {isBlackout ? 'OFFLINE' : 'PACKET LOSS'}
                  </span>
                </div>
                <div className="text-xs font-semibold">{node.name}</div>
                <div className="text-[11px] opacity-90">
                  Latency: <span className="font-mono font-bold">{node.latencyMs}ms</span> (Loss: {node.packetLossPct}%)
                  {node.powerSource === 'Power Failed' && (
                    <span className="ml-1 font-bold text-red-600 dark:text-red-300">
                      • Power Cut
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
