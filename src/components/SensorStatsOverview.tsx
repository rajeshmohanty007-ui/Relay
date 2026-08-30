'use client';

import type { SensorNetworkSummary } from '../lib/waterSensors';

interface SensorStatsOverviewProps {
  summary: SensorNetworkSummary;
}

export default function SensorStatsOverview({ summary }: SensorStatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {}
      <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Water Sensors
          </span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {summary.totalSensors}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">deployed</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{summary.normalCount} Safe</span>
          <span>•</span>
          <span className="font-medium text-amber-600 dark:text-amber-400">{summary.advisoryCount} Advisory</span>
        </div>
      </div>

      {}
      <div className="flex flex-col justify-between rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-xs dark:border-red-900/40 dark:bg-red-950/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
            High Flood Alerts
          </span>
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/60 dark:text-red-300">
            URGENT
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
            {summary.activeAlertsCount}
          </span>
          <span className="text-xs text-red-500/80">zones critical</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
          <span>{summary.criticalCount} Overflowing</span>
          <span>•</span>
          <span>{summary.warningCount} Warning</span>
        </div>
      </div>

      {}
      <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Peak Basin Level
          </span>
          <span className="text-[10px] font-mono text-sky-500">DATUM</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
            {summary.maxWaterLevelM.toFixed(1)}m
          </span>
          <span className="text-xs text-zinc-500">maximum</span>
        </div>
        <div className="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">
          Peak at: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{summary.highestRiskSensor?.code ?? 'N/A'}</span>
        </div>
      </div>

      {}
      <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Basin Rise Rate
          </span>
          <span className="text-xs">⚡</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold tracking-tight ${
              summary.averageRiseRateMps > 0.3
                ? 'text-amber-500'
                : summary.averageRiseRateMps > 0
                ? 'text-sky-500'
                : 'text-emerald-500'
            }`}
          >
            {summary.averageRiseRateMps > 0 ? `+${summary.averageRiseRateMps}` : summary.averageRiseRateMps}
          </span>
          <span className="text-xs text-zinc-500">m / hour</span>
        </div>
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {summary.averageRiseRateMps > 0.4 ? 'Rapid Inundation Surge' : 'Moderate Hydrologic Drift'}
        </div>
      </div>

      {}
      <div className="col-span-2 flex flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs sm:col-span-1 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Submerged Roads
          </span>
          <span className="text-xs">🛣️</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
            {summary.totalSubmergedRoads}
          </span>
          <span className="text-xs text-amber-600/80">segments</span>
        </div>
        <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
          Disaster Convoy Reroute Required
        </div>
      </div>
    </div>
  );
}
