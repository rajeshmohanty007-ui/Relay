'use client';

import type { WaterSensor } from '../lib/waterSensors';

interface SensorTelemetryCardProps {
  sensor: WaterSensor;
  isSelected?: boolean;
  onSelect?: (sensor: WaterSensor) => void;
}

const HARDWARE_LABELS: Record<WaterSensor['hardwareType'], string> = {
  ultrasonic_gauge: 'Ultrasonic River Gauge',
  hydrostatic_pressure: 'Hydrostatic Pressure Cell',
  radar_flow_doppler: 'Doppler Radar Velocity',
  submersible_logger: 'Submersible Water Logger',
  culvert_inundation_sensor: 'Culvert Inundation Node',
};

const STATUS_BADGE: Record<
  WaterSensor['status'],
  { bg: string; text: string; border: string; label: string }
> = {
  normal: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', label: 'Normal' },
  advisory: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', label: 'Advisory' },
  warning: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', label: 'Warning' },
  critical: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', label: 'Critical Flood' },
};

export default function SensorTelemetryCard({
  sensor,
  isSelected = false,
  onSelect,
}: SensorTelemetryCardProps) {
  const badge = STATUS_BADGE[sensor.status];

  
  const maxScale = sensor.criticalLevelM * 1.15;
  const currentPct = Math.min(100, Math.max(0, (sensor.currentLevelM / maxScale) * 100));
  const advisoryPct = (sensor.advisoryLevelM / maxScale) * 100;
  const warningPct = (sensor.warningLevelM / maxScale) * 100;
  const criticalPct = (sensor.criticalLevelM / maxScale) * 100;

  
  const history = sensor.history || [];
  const sparklineSvg = (() => {
    if (history.length < 2) return null;
    const width = 160;
    const height = 40;
    const padding = 4;

    const values = history.map((h) => h.waterLevelM);
    const min = Math.min(...values, sensor.baselineLevelM);
    const max = Math.max(...values, sensor.warningLevelM);
    const range = max - min || 1;

    const pts = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathData = `M ${pts.join(' L ')}`;
    const strokeColor =
      sensor.status === 'critical'
        ? '#997460' 
        : sensor.status === 'warning'
          ? '#EDE4DF' 
          : sensor.status === 'advisory'
            ? '#6AADAB' 
            : '#206E6B'; 

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-full overflow-visible">
        <path d={pathData} fill="none" stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {}
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
      onClick={() => onSelect?.(sensor)}
      className={`group flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${isSelected
          ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20 dark:border-sky-500 dark:bg-sky-950/20'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
        } ${onSelect ? 'cursor-pointer' : ''}`}
    >
      {}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                {sensor.code}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {HARDWARE_LABELS[sensor.hardwareType]}
              </span>
            </div>
            <h4 className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-sky-600 dark:group-hover:text-sky-400">
              {sensor.name}
            </h4>
          </div>

          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Basin: <span className="font-medium text-zinc-700 dark:text-zinc-300">{sensor.basinSection}</span>
        </div>

        {}
        <div className="mt-3.5 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
              {sensor.currentLevelM.toFixed(2)}
            </span>
            <span className="ml-1 text-sm font-medium text-zinc-500">m</span>
          </div>

          <div className="text-right">
            <div
              className={`font-mono text-xs font-bold ${sensor.rateOfRiseMPerHour > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
            >
              {sensor.rateOfRiseMPerHour > 0 ? `+${sensor.rateOfRiseMPerHour}` : sensor.rateOfRiseMPerHour} m/h
            </div>
            <div className="text-[10px] text-zinc-400">Velocity: {sensor.flowVelocityMps} m/s</div>
          </div>
        </div>

        {}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Normal: {sensor.normalLevelM}m</span>
            <span>Warning: {sensor.warningLevelM}m</span>
            <span className="font-bold text-red-500">Crit: {sensor.criticalLevelM}m</span>
          </div>
          <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            {}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 opacity-70"
              style={{ left: `${advisoryPct}%` }}
            />
            {}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-10 opacity-70"
              style={{ left: `${warningPct}%` }}
            />
            {}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-10 opacity-90"
              style={{ left: `${criticalPct}%` }}
            />

            {}
            <div
              className={`h-full transition-all duration-300 rounded-full ${sensor.status === 'critical'
                  ? 'bg-red-500'
                  : sensor.status === 'warning'
                    ? 'bg-orange-500'
                    : sensor.status === 'advisory'
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                }`}
              style={{ width: `${currentPct}%` }}
            />
          </div>
        </div>

        {}
        <div className="mt-3">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Water Level History
          </div>
          {sparklineSvg}
        </div>

        {sensor.roadSubmersionDepthM > 0 && (
          <div className="mt-2.5 rounded-md bg-red-50 p-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/50 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Road Submersion: +{sensor.roadSubmersionDepthM}m above corridor road surface!</span>
          </div>
        )}
      </div>

      {}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[10px] text-zinc-400 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span>🔋 {sensor.batteryPct}%</span>
          <span>📶 {sensor.signalDbm} dBm</span>
        </div>
        <span>Discharge: {sensor.dischargeRateCumecs} m³/s</span>
      </div>
    </div>
  );
}
