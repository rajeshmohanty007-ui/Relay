'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { MapLayer } from './MapViewTopo';
import {
  type WaterSensor,
  type WaterLevelStatus,
  type WeatherScenarioId,
  initializeSensors,
  stepSensorSimulation,
  computeSensorSummary,
} from '../lib/waterSensors';

export interface MapLayerToggleProps {
  visibleLayers: Set<MapLayer>;
  onChange: (layers: Set<MapLayer>) => void;
}

interface LayerOption {
  id: MapLayer;
  label: string;
  sublabel: string;
  shortKey: string;
  icon: (active: boolean) => React.ReactNode;
}

const LAYERS: LayerOption[] = [
  {
    id: 'grid',
    label: 'RADAR GRID',
    sublabel: 'Coordinate grid & markers',
    shortKey: 'G',
    icon: (active) => (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="9" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} />
        <line x1="12" y1="3" x2="12" y2="21" strokeDasharray="2 2" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} />
        <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="2 2" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'contours',
    label: 'TOPO TERRAIN',
    sublabel: 'Elevation contours & relief',
    shortKey: 'T',
    icon: (active) => (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M3 18c3-4 6-2 9-5s6-4 9-2" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} />
        <path d="M3 12c3-4 6-2 9-5s6-4 9-2" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} opacity="0.7" />
        <path d="M3 6c3-4 6-2 9-5s6-4 9-2" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'edges',
    label: 'ROAD NETWORK',
    sublabel: 'Evacuation corridors & status',
    shortKey: 'R',
    icon: (active) => (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <line x1="4" y1="19" x2="20" y2="5" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} strokeWidth="2.5" />
        <line x1="4" y1="5" x2="14" y2="15" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} strokeWidth="1.5" strokeDasharray="2 2" />
        <circle cx="4" cy="19" r="2" fill="currentColor" />
        <circle cx="20" cy="5" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'nodes',
    label: 'WAYPOINT NODES',
    sublabel: 'Shelters, depots & junctions',
    shortKey: 'N',
    icon: (active) => (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="7" y="7" width="10" height="10" transform="rotate(45 12 12)" className={active ? 'stroke-signal-accent fill-signal-accent/20' : 'stroke-zinc-500 fill-zinc-800'} />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'convoys',
    label: 'ACTIVE CONVOYS',
    sublabel: 'Supply fleet telemetry',
    shortKey: 'C',
    icon: (active) => (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <circle cx="12" cy="12" r="8" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} strokeDasharray="3 3" />
        <line x1="12" y1="2" x2="12" y2="5" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} />
        <line x1="12" y1="19" x2="12" y2="22" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} />
      </svg>
    ),
  },
  {
    id: 'sensors',
    label: 'HYDRO SENSORS',
    sublabel: 'River gauges & flood crossings',
    shortKey: 'H',
    icon: (active) => (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M2 12c3-3 6-3 9 0s6 3 9 0" className={active ? 'stroke-cyan-400' : 'stroke-zinc-500'} />
        <path d="M2 16c3-3 6-3 9 0s6 3 9 0" className={active ? 'stroke-cyan-400' : 'stroke-zinc-500'} />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

const STATUS_COLOR_MAP: Record<WaterLevelStatus, { badge: string; text: string; bar: string }> = {
  normal: {
    badge: 'bg-[#203024] text-status-ok border-[#4B7B4E]/60',
    text: 'text-status-ok',
    bar: 'bg-status-ok',
  },
  advisory: {
    badge: 'bg-[#2C2A1E] text-status-warn border-[#B8863B]/60',
    text: 'text-status-warn',
    bar: 'bg-status-warn',
  },
  warning: {
    badge: 'bg-[#352718] text-status-warn border-[#B8863B]/60',
    text: 'text-status-warn',
    bar: 'bg-status-warn',
  },
  critical: {
    badge: 'bg-[#351C1A] text-status-danger border-[#A6403A]/60 animate-pulse',
    text: 'text-status-danger',
    bar: 'bg-status-danger',
  },
};

// Key strategic watershed sensors directly tied to the flood crisis scenario
const STRATEGIC_SENSOR_IDS = new Set([
  'ws_periyar_dam_01',    // Upper Dam Sluice Gate
  'ws_central_bridge_07',  // Central Causeway Cross
  'ws_canal_sluice_12',   // Grand Canal Sluice Gate
  'ws_causeway_haven_14', // Causeway Haven Culvert
  'ws_west_culvert_15',   // West Canal Sluice Culvert
  'ws_delta_stadium_17',  // Delta Sports Complex Canal
]);

export default function MapLayerToggle({ visibleLayers, onChange }: MapLayerToggleProps) {
  const [activeTab, setActiveTab] = useState<'layers' | 'sensors'>('layers');
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Curated strategic water level sensors state
  const [sensors, setSensors] = useState<WaterSensor[]>(() =>
    initializeSensors().filter((s) => STRATEGIC_SENSOR_IDS.has(s.id)),
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scenarioId] = useState<WeatherScenarioId>('heavy_monsoon');

  // Hydrological simulation interval
  useEffect(() => {
    const timer = setInterval(() => {
      setSensors((prev) => stepSensorSimulation(prev, scenarioId, 15));
    }, 2000);
    return () => clearInterval(timer);
  }, [scenarioId]);

  const summary = useMemo(() => computeSensorSummary(sensors), [sensors]);
  const activeAlertCount = summary.criticalCount + summary.warningCount;
  const submergedCount = useMemo(() => sensors.filter((s) => s.roadSubmersionDepthM > 0).length, [sensors]);

  const displayedSensors = useMemo(() => {
    let list = sensors;
    if (statusFilter === 'alerts') {
      list = sensors.filter((s) => s.status === 'critical' || s.status === 'warning');
    } else if (statusFilter === 'submerged') {
      list = sensors.filter((s) => s.roadSubmersionDepthM > 0);
    }
    return list.slice().sort((a, b) => {
      const score = (st: WaterLevelStatus) =>
        st === 'critical' ? 4 : st === 'warning' ? 3 : st === 'advisory' ? 2 : 1;
      return score(b.status) - score(a.status);
    });
  }, [sensors, statusFilter]);

  const expanded = isHovered || isPinned;

  const toggleLayer = (layer: MapLayer) => {
    const next = new Set(visibleLayers);
    if (next.has(layer)) {
      next.delete(layer);
    } else {
      next.add(layer);
    }
    onChange(next);
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative z-20 flex shrink-0 flex-col justify-between bg-[#1C1B17] select-none transition-all duration-200 ease-in-out ${
        expanded ? 'w-80 shadow-2xl' : 'w-16'
      }`}
    >
      {/* Top Section */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden p-2.5 gap-2.5">
        {/* Header Strip */}
        <div className="flex items-center justify-between border-b border-[#35332C]/60 pb-2 px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* Tactical Icon */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#35332C] bg-[#24221D] rounded-xl text-signal-accent shadow-sm">
              {activeTab === 'layers' ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              ) : (
                <span className="text-sm">🌊</span>
              )}
            </div>
            {expanded && (
              <div className="flex flex-col overflow-hidden whitespace-nowrap">
                <span className="font-display text-[10px] font-black tracking-widest text-[#FAF9F6] uppercase leading-none">
                  {activeTab === 'layers' ? 'MAP LAYERS' : 'HYDRO SENSORS'}
                </span>
                <span className="font-mono text-[8px] text-[#E4E1D8]/60 mt-0.5">
                  {activeTab === 'layers'
                    ? `${visibleLayers.size}/${LAYERS.length} VISIBLE`
                    : `${activeAlertCount} ACTIVE ALERTS`}
                </span>
              </div>
            )}
          </div>

          {/* Pin/Lock Expansion Toggle Button (when expanded) */}
          {expanded && (
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Unpin sidebar (auto-collapse)' : 'Pin sidebar expanded'}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] transition-all ${
                isPinned
                  ? 'border-signal-accent bg-signal-accent/30 text-[#FAF9F6]'
                  : 'border-[#35332C] bg-[#24221D] text-[#E4E1D8]/70 hover:text-[#FAF9F6]'
              }`}
            >
              {isPinned ? '📌' : '🔒'}
            </button>
          )}
        </div>

        {/* Tab Switcher: Responsive for Collapsed vs Expanded */}
        {expanded ? (
          /* Expanded Full Width Tab Strip */
          <div className="flex border border-[#35332C] bg-[#24221D] p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('layers')}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-[8px] font-display font-black tracking-wider uppercase transition-all ${
                activeTab === 'layers'
                  ? 'bg-signal-accent text-white font-bold shadow-sm'
                  : 'text-[#E4E1D8]/70 hover:text-white'
              }`}
              title="Map Layer Controls"
            >
              MAP LAYERS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sensors')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[8px] font-display font-black tracking-wider uppercase transition-all ${
                activeTab === 'sensors'
                  ? 'bg-signal-accent text-white font-bold shadow-sm'
                  : 'text-[#E4E1D8]/70 hover:text-white'
              }`}
              title="Water Level Telemetry Sensors"
            >
              <span>WATER SENSORS</span>
              {activeAlertCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[7px] font-mono font-bold ${
                  activeTab === 'sensors' ? 'bg-black text-white' : 'bg-status-danger text-white animate-pulse'
                }`}>
                  {activeAlertCount}
                </span>
              )}
            </button>
          </div>
        ) : (
          /* Collapsed Vertical Icon Toggle Buttons */
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('layers')}
              className={`flex h-9 w-full items-center justify-center rounded-xl border transition-all ${
                activeTab === 'layers'
                  ? 'border-signal-accent bg-signal-accent/30 text-[#FAF9F6]'
                  : 'border-[#35332C] bg-[#24221D] text-[#E4E1D8]/70 hover:text-white'
              }`}
              title="Switch to Map Layers"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sensors')}
              className={`relative flex h-9 w-full items-center justify-center rounded-xl border transition-all ${
                activeTab === 'sensors'
                  ? 'border-signal-accent bg-signal-accent/30 text-[#FAF9F6]'
                  : 'border-[#35332C] bg-[#24221D] text-[#E4E1D8]/70 hover:text-white'
              }`}
              title="Switch to Water Level Sensors"
            >
              <span className="text-sm">🌊</span>
              {activeAlertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-status-danger animate-pulse" />
              )}
            </button>
          </div>
        )}

        {/* Tab Content 1: Map Layers */}
        {activeTab === 'layers' && (
          <div className="flex flex-col gap-1.5 pt-1 overflow-y-auto">
            {LAYERS.map((layer) => {
              const isVisible = visibleLayers.has(layer.id);
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => toggleLayer(layer.id)}
                  className={`group flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-150 border ${
                    isVisible
                      ? 'border-signal-accent bg-[#24221D] text-[#FAF9F6] font-bold shadow-sm'
                      : 'border-[#35332C] bg-[#1C1B17] text-[#E4E1D8]/60 hover:text-white hover:bg-[#24221D] opacity-70 hover:opacity-100'
                  }`}
                  title={`Toggle ${layer.label} (${isVisible ? 'Active' : 'Hidden'})`}
                >
                  {/* Layer Icon */}
                  <div className="flex shrink-0 items-center justify-center">
                    {layer.icon(isVisible)}
                  </div>

                  {/* Expanded Label & Details */}
                  {expanded && (
                    <div className="flex flex-1 items-center justify-between overflow-hidden whitespace-nowrap text-left">
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="font-display text-[9px] font-bold tracking-wider leading-none truncate">
                          {layer.label}
                        </span>
                        <span className="font-mono text-[7px] text-[#E4E1D8]/60 mt-0.5 truncate">
                          {layer.sublabel}
                        </span>
                      </div>

                      {/* Status Pill */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isVisible
                              ? 'bg-status-ok shadow-[0_0_6px_#4B7B4E]'
                              : 'bg-[#35332C]'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Tab Content 2: Water Level Sensor Telemetry */}
        {activeTab === 'sensors' && (
          <div className="flex flex-col min-h-0 flex-1 gap-2 overflow-hidden">
            {/* Header: Basin Hydrological Overview */}
            {expanded && (
              <div className="flex flex-col gap-2 border border-[#35332C] bg-[#24221D] p-2.5 rounded-2xl shrink-0">
                <div className="flex items-center justify-between text-[8px] font-mono">
                  <span className="text-signal-accent font-bold uppercase tracking-wider">
                    PERIYAR BASIN TELEMETRY
                  </span>
                  <span className="text-[#E4E1D8] font-bold">
                    {submergedCount > 0 ? (
                      <span className="text-status-danger">⛔ {submergedCount} SUBMERGED</span>
                    ) : (
                      <span className="text-status-ok">ROADS CLEAR</span>
                    )}
                  </span>
                </div>

                {/* Key Summary Strip */}
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[8px] pt-0.5">
                  <div className="border border-[#35332C] bg-[#1C1B17] py-1 px-1 rounded-xl">
                    <span className="text-[#E4E1D8]/60 block text-[7px] uppercase">MAX STAGE</span>
                    <span className="font-bold text-white text-[9px]">{summary.maxWaterLevelM.toFixed(1)}m</span>
                  </div>
                  <div className="border border-[#35332C] bg-[#1C1B17] py-1 px-1 rounded-xl">
                    <span className="text-[#E4E1D8]/60 block text-[7px] uppercase">ALERTS</span>
                    <span className={`font-bold text-[9px] ${activeAlertCount > 0 ? 'text-status-danger' : 'text-status-ok'}`}>
                      {activeAlertCount} / {sensors.length}
                    </span>
                  </div>
                  <div className="border border-[#35332C] bg-[#1C1B17] py-1 px-1 rounded-xl">
                    <span className="text-[#E4E1D8]/60 block text-[7px] uppercase">AVG RISE</span>
                    <span className="font-bold text-status-warn text-[9px]">
                      +{summary.averageRiseRateMps.toFixed(2)}m/h
                    </span>
                  </div>
                </div>

                {/* Filter Selector */}
                <div className="flex gap-1 pt-0.5">
                  {[
                    { id: 'all', label: `ALL (${sensors.length})` },
                    { id: 'alerts', label: `ALERTS (${activeAlertCount})` },
                    { id: 'submerged', label: `INUNDATED (${submergedCount})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`flex-1 py-1 rounded-lg text-[7px] font-mono uppercase tracking-wider border transition-all ${
                        statusFilter === f.id
                          ? 'border-signal-accent bg-signal-accent/30 text-white font-bold'
                          : 'border-[#35332C] bg-[#1C1B17] text-[#E4E1D8]/70 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Streamlined Sensor Station List */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5">
              {displayedSensors.map((sensor) => {
                const styles = STATUS_COLOR_MAP[sensor.status];
                const pct = Math.min(100, Math.round((sensor.currentLevelM / sensor.criticalLevelM) * 100));

                return (
                  <div
                    key={sensor.id}
                    className={`border p-2.5 bg-[#24221D] rounded-2xl flex flex-col gap-2 transition-all ${
                      sensor.status === 'critical'
                        ? 'border-[#A6403A] shadow-[0_0_12px_rgba(166,64,58,0.15)]'
                        : sensor.status === 'warning'
                        ? 'border-[#B8863B] shadow-[0_0_10px_rgba(184,134,59,0.1)]'
                        : 'border-[#35332C]'
                    }`}
                  >
                    {/* Collapsed Icon-Only View */}
                    {!expanded ? (
                      <div
                        className="flex flex-col items-center justify-center py-1 gap-1"
                        title={`${sensor.name} (${sensor.code}): ${sensor.currentLevelM.toFixed(1)}m — ${sensor.status.toUpperCase()}`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${styles.bar}`} />
                        <span className="font-mono text-[7px] text-[#E4E1D8] font-bold">{sensor.currentLevelM.toFixed(1)}m</span>
                      </div>
                    ) : (
                      /* Expanded Realistic Station Card */
                      <>
                        {/* Station Name & Status */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[8px] font-bold text-signal-accent shrink-0">
                              {sensor.code}
                            </span>
                            <span className="font-display text-[9px] font-bold text-[#FAF9F6] truncate">
                              {sensor.name}
                            </span>
                          </div>
                          <span className={`border px-2 py-0.5 rounded-full text-[7px] font-mono font-bold uppercase shrink-0 ${styles.badge}`}>
                            {sensor.status}
                          </span>
                        </div>

                        {/* Gauge Telemetry & Threshold */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-baseline justify-between font-mono text-[8px]">
                            <div className="flex items-center gap-1">
                              <span className={`text-[11px] font-black ${styles.text}`}>
                                {sensor.currentLevelM.toFixed(2)}m
                              </span>
                              <span className="text-[7px] text-[#E4E1D8]/60">
                                / {sensor.criticalLevelM.toFixed(1)}m CREST
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[7px] text-[#E4E1D8]/80">
                              <span className={sensor.rateOfRiseMPerHour > 0.3 ? 'text-status-warn font-bold' : 'text-[#E4E1D8]/80'}>
                                {sensor.rateOfRiseMPerHour > 0 ? `▲ +${sensor.rateOfRiseMPerHour.toFixed(2)}m/h` : `▼ ${sensor.rateOfRiseMPerHour.toFixed(2)}m/h`}
                              </span>
                            </div>
                          </div>

                          {/* Mini Multi-Segment Progress Gauge */}
                          <div className="h-2 w-full bg-[#1C1B17] border border-[#35332C] rounded-full flex overflow-hidden p-0.5">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${styles.bar}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Operational Road Impact Tag */}
                        {sensor.roadSubmersionDepthM > 0 ? (
                          <div className="border border-[#A6403A]/60 bg-[#351C1A] px-2 py-1 rounded-xl text-[7px] font-mono text-[#FAF9F6] flex items-center justify-between">
                            <span>⛔ INUNDATION: +{sensor.roadSubmersionDepthM.toFixed(2)}m</span>
                            <span className="text-[#E4E1D8]/70 uppercase truncate max-w-[90px]">{sensor.basinSection}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center font-mono text-[7px] text-[#E4E1D8]/70 pt-0.5">
                            <span className="truncate">{sensor.basinSection}</span>
                            <span>FLOW: {sensor.flowVelocityMps.toFixed(1)} m/s</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer / Expansion Prompt */}
      <div className="border-t border-[#35332C]/60 p-2.5 shrink-0">
        <button
          type="button"
          onClick={() => setIsPinned(!isPinned)}
          className="flex w-full items-center justify-center gap-1.5 border border-[#35332C] bg-[#24221D] py-1.5 rounded-xl text-[8px] font-mono text-[#E4E1D8]/80 hover:text-white hover:border-signal-accent transition-all"
          title={expanded ? 'Click to collapse sidebar' : 'Click to expand sidebar'}
        >
          <span>{expanded ? '◀ COLLAPSE' : '▶'}</span>
        </button>
      </div>
    </aside>
  );
}
