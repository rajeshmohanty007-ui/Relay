'use client';

import type { NetworkNode } from '../lib/networkConnectivity';

interface NetworkNodeCardProps {
  node: NetworkNode;
  isSelected?: boolean;
  onSelect?: (node: NetworkNode) => void;
}

const STATUS_BADGE: Record<
  NetworkNode['status'],
  { bg: string; text: string; border: string; label: string }
> = {
  optimal: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', label: 'Optimal' },
  degraded: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', label: 'Degraded' },
  critical_drop: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', label: 'Packet Loss' },
  blackout: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', label: 'Offline / Blackout' },
};

export default function NetworkNodeCard({
  node,
  isSelected = false,
  onSelect,
}: NetworkNodeCardProps) {
  const badge = STATUS_BADGE[node.status];

  // Mini sparkline generation for latency history
  const history = node.history || [];
  const sparklineSvg = (() => {
    if (history.length < 2) return null;
    const width = 160;
    const height = 40;
    const padding = 4;

    const values = history.map((h) => h.latencyMs);
    const min = Math.min(...values, 10);
    const max = Math.max(...values, 120);
    const range = max - min || 1;

    const pts = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathData = `M ${pts.join(' L ')}`;
    const strokeColor =
      node.status === 'blackout'
        ? '#ef4444'
        : node.status === 'critical_drop'
        ? '#f97316'
        : node.status === 'degraded'
        ? '#f59e0b'
        : '#10b981';

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-full overflow-visible">
        <path d={pathData} fill="none" stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {pts.length > 0 && (
          <circle
            cx={Number(pts[pts.length - 1].split(',')[0])}
            cy={Number(pts[pts.length - 1].split(',')[1])}
            r={3}
            fill={strokeColor}
          />
        )}
      </svg>
    );
  })();

  return (
    <div
      onClick={() => onSelect?.(node)}
      className={`group flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
        isSelected
          ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20 dark:border-sky-500 dark:bg-sky-950/20'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
      } ${onSelect ? 'cursor-pointer' : ''}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                {node.code}
              </span>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {node.type}
              </span>
            </div>
            <h4 className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-sky-600 dark:group-hover:text-sky-400">
              {node.name}
            </h4>
          </div>

          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="truncate font-medium text-sky-700 dark:text-sky-300">{node.activeChannel}</span>
        </div>

        {/* Latency & Packet Loss Telemetry */}
        <div className="mt-3.5 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
              {node.latencyMs}
            </span>
            <span className="ml-1 text-sm font-medium text-zinc-500">ms</span>
          </div>

          <div className="text-right">
            <div
              className={`font-mono text-xs font-bold ${
                node.packetLossPct > 10
                  ? 'text-red-600 dark:text-red-400'
                  : node.packetLossPct > 2
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              Loss: {node.packetLossPct}%
            </div>
            <div className="text-[10px] text-zinc-400">Bandwidth: {node.bandwidthMbps} Mbps</div>
          </div>
        </div>

        {/* Latency Sparkline */}
        <div className="mt-3">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Roundtrip Ping Trend
          </div>
          {sparklineSvg}
        </div>

        {node.status === 'blackout' && (
          <div className="mt-2.5 rounded-md bg-red-50 p-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/50">
            🚨 Blackout: Base tower offline. Relay unable to route convoy telemetry.
          </div>
        )}
      </div>

      {/* Footer telemetry status */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[10px] text-zinc-400 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span>🔋 {node.batteryHoursRemaining}h ({node.powerSource})</span>
        </div>
        <span>📱 {node.connectedDevices} transceivers</span>
      </div>
    </div>
  );
}
