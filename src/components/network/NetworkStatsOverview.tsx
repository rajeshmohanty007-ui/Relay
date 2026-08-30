'use client';

import type { NetworkSummary } from '../../lib/networkConnectivity';

interface NetworkStatsOverviewProps {
  summary: NetworkSummary;
}

export default function NetworkStatsOverview({ summary }: NetworkStatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {/* Total Network Stations */}
      <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Telecom Hubs
          </span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {summary.totalNodes}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">monitored</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{summary.optimalCount} Optimal</span>
          <span>•</span>
          <span className="font-medium text-amber-600 dark:text-amber-400">{summary.degradedCount} Degraded</span>
        </div>
      </div>

      {/* Blackout & Critical Drop Outages */}
      <div className="flex flex-col justify-between rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-xs dark:border-red-900/40 dark:bg-red-950/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
            Blackout Outages
          </span>
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/60 dark:text-red-300">
            ALERT
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
            {summary.blackoutCount + summary.criticalCount}
          </span>
          <span className="text-xs text-red-500/80">nodes severed</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
          <span>{summary.blackoutCount} Offline</span>
          <span>•</span>
          <span>{summary.criticalCount} Packet Dropping</span>
        </div>
      </div>

      {/* Average Network Latency */}
      <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Mean Roundtrip Ping
          </span>
          <span className="text-[10px] font-mono text-sky-500">RTT</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold tracking-tight ${
              summary.averageLatencyMs > 120
                ? 'text-red-500'
                : summary.averageLatencyMs > 60
                ? 'text-amber-500'
                : 'text-sky-600 dark:text-sky-400'
            }`}
          >
            {summary.averageLatencyMs}
          </span>
          <span className="text-xs text-zinc-500">ms</span>
        </div>
        <div className="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">
          Peak latency: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{summary.highestRiskNode?.code ?? 'N/A'}</span>
        </div>
      </div>

      {/* Mean Packet Loss */}
      <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Mean Packet Loss
          </span>
          <span className="text-xs">📡</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold tracking-tight ${
              summary.averagePacketLossPct > 10
                ? 'text-red-500'
                : summary.averagePacketLossPct > 3
                ? 'text-amber-500'
                : 'text-emerald-500'
            }`}
          >
            {summary.averagePacketLossPct}%
          </span>
          <span className="text-xs text-zinc-500">dropped</span>
        </div>
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {summary.averagePacketLossPct > 8 ? 'Severe Multipath Distortion' : 'Nominal Transmission Link'}
        </div>
      </div>

      {/* Towers on Backup Power */}
      <div className="col-span-2 flex flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs sm:col-span-1 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Power Grid Strain
          </span>
          <span className="text-xs">🔋</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
            {summary.towersOnBatteryCount}
          </span>
          <span className="text-xs text-amber-600/80">towers on battery</span>
        </div>
        <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
          Generators / Solar Active
        </div>
      </div>
    </div>
  );
}
