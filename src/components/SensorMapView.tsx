'use client';

import { useMemo, useState } from 'react';
import type { WaterSensor } from '../lib/waterSensors';

interface SensorMapViewProps {
  sensors: WaterSensor[];
  selectedSensorId: string | null;
  onSelectSensor: (sensor: WaterSensor | null) => void;
  showRiverOverlays?: boolean;
  showRoadGrid?: boolean;
}

const VIEW_WIDTH = 920;
const VIEW_HEIGHT = 650;
const PADDING_RATIO = 0.08;

// Coordinate bounds mapping Aluva-Periyar basin
const MIN_LAT = 10.075;
const MAX_LAT = 10.245;
const MIN_LNG = 76.255;
const MAX_LNG = 76.495;

function projectCoord(lat: number, lng: number): { x: number; y: number } {
  const latRange = MAX_LAT - MIN_LAT;
  const lngRange = MAX_LNG - MIN_LNG;
  const paddingX = VIEW_WIDTH * PADDING_RATIO;
  const paddingY = VIEW_HEIGHT * PADDING_RATIO;
  const usableWidth = VIEW_WIDTH - paddingX * 2;
  const usableHeight = VIEW_HEIGHT - paddingY * 2;

  const xFrac = (lng - MIN_LNG) / lngRange;
  const yFrac = 1 - (lat - MIN_LAT) / latRange;

  return {
    x: paddingX + xFrac * usableWidth,
    y: paddingY + yFrac * usableHeight,
  };
}

const STATUS_CONFIG: Record<
  WaterSensor['status'],
  { fill: string; stroke: string; label: string; ringColor: string }
> = {
  normal: { fill: '#10b981', stroke: '#059669', label: 'Normal Level', ringColor: 'rgba(16, 185, 129, 0.3)' },
  advisory: { fill: '#f59e0b', stroke: '#d97706', label: 'Advisory Rising', ringColor: 'rgba(245, 158, 11, 0.4)' },
  warning: { fill: '#f97316', stroke: '#ea580c', label: 'High Warning', ringColor: 'rgba(249, 115, 22, 0.6)' },
  critical: { fill: '#ef4444', stroke: '#b91c1c', label: 'Critical Flood Overflow', ringColor: 'rgba(239, 68, 68, 0.8)' },
};

export default function SensorMapView({
  sensors,
  selectedSensorId,
  onSelectSensor,
  showRiverOverlays = true,
  showRoadGrid = true,
}: SensorMapViewProps) {
  const [hoveredSensorId, setHoveredSensorId] = useState<string | null>(null);

  const projectedSensors = useMemo(() => {
    return sensors.map((s) => ({
      ...s,
      pos: projectCoord(s.lat, s.lng),
    }));
  }, [sensors]);

  const activeSensor = useMemo(() => {
    const targetId = hoveredSensorId ?? selectedSensorId;
    return projectedSensors.find((s) => s.id === targetId) ?? null;
  }, [hoveredSensorId, selectedSensorId, projectedSensors]);

  // River Channels topology paths
  const riverMainStem = useMemo(() => {
    const pts = [
      projectCoord(10.235, 76.47), // Upper dam reach
      projectCoord(10.228, 76.44), // Dam spillway
      projectCoord(10.215, 76.41),
      projectCoord(10.205, 76.392), // Riverbank north
      projectCoord(10.192, 76.365), // Causeway bridge
      projectCoord(10.165, 76.345),
      projectCoord(10.138, 76.342), // Grand canal junction
      projectCoord(10.11, 76.345), // Delta split
      projectCoord(10.089, 76.368), // Marshland bend
      projectCoord(10.08, 76.31),
      projectCoord(10.092, 76.265), // Estuary outfall
    ];
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, []);

  const canalBranches = useMemo(() => {
    const p1 = projectCoord(10.185, 76.42);
    const p2 = projectCoord(10.174, 76.448);
    const p3 = projectCoord(10.14, 76.395);
    const p4 = projectCoord(10.115, 76.425);
    const pathEast = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} L ${p3.x.toFixed(1)} ${p3.y.toFixed(1)} L ${p4.x.toFixed(1)} ${p4.y.toFixed(1)}`;

    const pw1 = projectCoord(10.162, 76.261);
    const pw2 = projectCoord(10.132, 76.295);
    const pw3 = projectCoord(10.108, 76.29);
    const pw4 = projectCoord(10.085, 76.28);
    const pathWest = `M ${pw1.x.toFixed(1)} ${pw1.y.toFixed(1)} L ${pw2.x.toFixed(1)} ${pw2.y.toFixed(1)} L ${pw3.x.toFixed(1)} ${pw3.y.toFixed(1)} L ${pw4.x.toFixed(1)} ${pw4.y.toFixed(1)}`;

    return [pathEast, pathWest];
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-zinc-200 bg-slate-950 p-2 shadow-inner dark:border-zinc-800">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-full w-full select-none"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
      >
        <defs>
          {/* Subtle hydro background grid */}
          <pattern id="hydroGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="0.8" />
          </pattern>

          {/* Water channel gradient */}
          <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.75" />
          </linearGradient>

          {/* Water shimmer effect */}
          <linearGradient id="canalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0369a1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.7" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Map Background Grid */}
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#090d16" />
        {showRoadGrid && <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#hydroGrid)" />}

        {/* River Hydrological Overlays */}
        {showRiverOverlays && (
          <g opacity={0.85}>
            {/* Catchment flood buffer / wetland glow */}
            <path
              d={riverMainStem}
              fill="none"
              stroke="#0369a1"
              strokeWidth={28}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.2}
            />
            {/* Main Periyar River Stem */}
            <path
              d={riverMainStem}
              fill="none"
              stroke="url(#riverGradient)"
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Center water flow pulse line */}
            <path
              d={riverMainStem}
              fill="none"
              stroke="#e0f2fe"
              strokeWidth={2}
              strokeDasharray="8 12"
              strokeLinecap="round"
              opacity={0.7}
              className="animate-pulse"
            />

            {/* Canal Tributaries */}
            {canalBranches.map((d, i) => (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.3}
                />
                <path
                  d={d}
                  fill="none"
                  stroke="url(#canalGradient)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}

            {/* Water features labels */}
            <text x={VIEW_WIDTH - 150} y={60} fill="#38bdf8" fontSize={11} fontWeight={600} opacity={0.6}>
              ▲ Upper Periyar Catchment
            </text>
            <text x={80} y={VIEW_HEIGHT - 35} fill="#38bdf8" fontSize={11} fontWeight={600} opacity={0.6}>
              ▼ Arabian Sea Estuary Outfall
            </text>
          </g>
        )}

        {/* Basin Sections Visual Boundary Lines */}
        <g opacity={0.25}>
          <line x1={VIEW_WIDTH * 0.45} y1={0} x2={VIEW_WIDTH * 0.45} y2={VIEW_HEIGHT} stroke="#38bdf8" strokeDasharray="4 6" />
          <line x1={0} y1={VIEW_HEIGHT * 0.52} x2={VIEW_WIDTH} y2={VIEW_HEIGHT * 0.52} stroke="#38bdf8" strokeDasharray="4 6" />
        </g>

        {/* Water Sensor Nodes */}
        <g>
          {projectedSensors.map((sensor) => {
            const isSelected = sensor.id === selectedSensorId;
            const isHovered = sensor.id === hoveredSensorId;
            const cfg = STATUS_CONFIG[sensor.status];
            const isAlert = sensor.status === 'warning' || sensor.status === 'critical';

            return (
              <g
                key={sensor.id}
                className="cursor-pointer transition-all duration-200"
                onClick={() => onSelectSensor(sensor)}
                onMouseEnter={() => setHoveredSensorId(sensor.id)}
                onMouseLeave={() => setHoveredSensorId(null)}
              >
                {/* Pulsing Radar Ring for Warning/Critical Alerts */}
                {isAlert && (
                  <circle
                    cx={sensor.pos.x}
                    cy={sensor.pos.y}
                    r={isSelected || isHovered ? 26 : 18}
                    fill={cfg.ringColor}
                    className="animate-ping"
                    style={{ transformOrigin: `${sensor.pos.x}px ${sensor.pos.y}px` }}
                  />
                )}

                {/* Outer Glow Halo for Selected Sensor */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={sensor.pos.x}
                    cy={sensor.pos.y}
                    r={18}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeDasharray={isSelected ? '3 3' : undefined}
                    filter="url(#glow)"
                  />
                )}

                {/* Submersion depth indicator halo */}
                {sensor.roadSubmersionDepthM > 0 && (
                  <circle
                    cx={sensor.pos.x}
                    cy={sensor.pos.y}
                    r={12 + sensor.roadSubmersionDepthM * 6}
                    fill="rgba(56, 189, 248, 0.2)"
                    stroke="#38bdf8"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                )}

                {/* Main Sensor Node Circle */}
                <circle
                  cx={sensor.pos.x}
                  cy={sensor.pos.y}
                  r={isSelected ? 10 : 8}
                  fill={cfg.fill}
                  stroke="#ffffff"
                  strokeWidth={2}
                  filter="url(#glow)"
                />

                {/* Water Level Reading Badge */}
                <g transform={`translate(${sensor.pos.x}, ${sensor.pos.y - 14})`}>
                  <rect
                    x={-28}
                    y={-14}
                    width={56}
                    height={16}
                    rx={8}
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke={cfg.stroke}
                    strokeWidth={1}
                  />
                  <text
                    x={0}
                    y={-3}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize={10}
                    fontWeight={700}
                    fontFamily="monospace"
                  >
                    {sensor.currentLevelM.toFixed(1)}m
                  </text>
                </g>

                {/* Sensor Name Text (Hover or Warning/Critical) */}
                {(isSelected || isHovered || isAlert) && (
                  <text
                    x={sensor.pos.x}
                    y={sensor.pos.y + 20}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={10}
                    fontWeight={600}
                    className="select-none drop-shadow"
                  >
                    {sensor.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Active Sensor Details Tooltip Overlay */}
      {activeSensor && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-20 w-80 rounded-lg border border-slate-700 bg-slate-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
            <div>
              <span className="font-mono text-[10px] font-bold text-sky-400">{activeSensor.code}</span>
              <h4 className="font-semibold text-slate-100">{activeSensor.name}</h4>
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: STATUS_CONFIG[activeSensor.status].fill + '33',
                color: STATUS_CONFIG[activeSensor.status].fill,
                border: `1px solid ${STATUS_CONFIG[activeSensor.status].fill}`,
              }}
            >
              {activeSensor.status}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-slate-800/80 p-1.5">
              <div className="text-[10px] text-slate-400">Current Level</div>
              <div className="font-mono text-sm font-bold text-sky-300">{activeSensor.currentLevelM}m</div>
            </div>
            <div className="rounded bg-slate-800/80 p-1.5">
              <div className="text-[10px] text-slate-400">Rate of Rise</div>
              <div
                className={`font-mono text-sm font-bold ${
                  activeSensor.rateOfRiseMPerHour > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {activeSensor.rateOfRiseMPerHour > 0 ? `+${activeSensor.rateOfRiseMPerHour}` : activeSensor.rateOfRiseMPerHour} m/h
              </div>
            </div>
            <div className="rounded bg-slate-800/80 p-1.5">
              <div className="text-[10px] text-slate-400">Flow Speed</div>
              <div className="font-mono text-sm font-bold text-slate-200">{activeSensor.flowVelocityMps} m/s</div>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-300">
            <span className="text-slate-400">Basin Zone:</span> {activeSensor.basinSection}
          </div>

          {activeSensor.roadSubmersionDepthM > 0 && (
            <div className="mt-1.5 rounded bg-red-950/70 p-1.5 text-[11px] font-medium text-red-200 border border-red-800/50">
              ⚠️ Inundation Alert: Road corridor submerged by {activeSensor.roadSubmersionDepthM}m water!
            </div>
          )}
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute right-4 top-4 flex flex-col gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 text-[11px] text-slate-300 backdrop-blur-md">
        <span className="font-semibold text-slate-200">Sensor Status Legend</span>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          <span>Normal (&lt; Advisory)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          <span>Advisory Rising</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
          <span>High Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
          <span>Critical Flood / Overflow</span>
        </div>
      </div>
    </div>
  );
}
