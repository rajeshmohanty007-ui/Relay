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
import {
  type NetworkNode,
  type NetworkScenarioId,
  type NetworkStatus,
  NETWORK_SCENARIOS,
  initializeNetworkNodes,
  stepNetworkSimulation,
  computeNetworkSummary,
} from '../lib/networkConnectivity';

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
  {
    id: 'labels',
    label: 'NODE LABELS',
    sublabel: 'Show node name overlay',
    shortKey: 'L',
    icon: (active) => (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="5" width="18" height="14" rx="2" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} />
        <path d="M7 10h10M7 14h6" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} />
      </svg>
    ),
  },
  {
    id: 'netdata',
    label: 'NETWORK DATA',
    sublabel: 'Node telecom mesh & telemetry',
    shortKey: 'M',
    icon: (active) => (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} />
        <path d="M12 6a6 6 0 0 1 6 6c0 3.314-2.686 6-6 6s-6-2.686-6-6a6 6 0 0 1 6-6z" className={active ? 'stroke-signal-accent' : 'stroke-zinc-500'} />
        <circle cx="12" cy="12" r="2" className={active ? 'fill-signal-accent' : 'fill-zinc-500'} />
      </svg>
    ),
  },
];

const STATUS_COLOR_MAP: Record<WaterLevelStatus, { badge: string; text: string; bar: string }> = {
  normal: {
    badge: 'bg-emerald-50 text-status-ok border-status-ok/60',
    text: 'text-status-ok',
    bar: 'bg-status-ok',
  },
  advisory: {
    badge: 'bg-amber-50 text-status-warn border-status-warn/60',
    text: 'text-status-warn',
    bar: 'bg-status-warn',
  },
  warning: {
    badge: 'bg-amber-100 text-status-warn border-status-warn/60',
    text: 'text-status-warn',
    bar: 'bg-status-warn',
  },
  critical: {
    badge: 'bg-red-100 text-status-danger border-status-danger/60 animate-pulse',
    text: 'text-status-danger',
    bar: 'bg-status-danger',
  },
};

const NET_STATUS_BADGE: Record<NetworkStatus, { badge: string; text: string; bar: string; label: string }> = {
  optimal: {
    badge: 'bg-emerald-50 text-status-ok border-status-ok/60',
    text: 'text-status-ok',
    bar: 'bg-status-ok',
    label: 'Optimal',
  },
  degraded: {
    badge: 'bg-amber-50 text-status-warn border-status-warn/60',
    text: 'text-status-warn',
    bar: 'bg-status-warn',
    label: 'Degraded',
  },
  critical_drop: {
    badge: 'bg-orange-100 text-status-warn border-status-warn/60',
    text: 'text-status-warn',
    bar: 'bg-status-warn',
    label: 'Packet Loss',
  },
  blackout: {
    badge: 'bg-red-100 text-status-danger border-status-danger/60 animate-pulse',
    text: 'text-status-danger',
    bar: 'bg-status-danger',
    label: 'Offline',
  },
};

const STRATEGIC_SENSOR_IDS = new Set([
  'ws_periyar_dam_01',    
  'ws_central_bridge_07',  
  'ws_canal_sluice_12',   
  'ws_causeway_haven_14', 
  'ws_west_culvert_15',   
  'ws_delta_stadium_17',  
]);

export default function MapLayerToggle({ visibleLayers, onChange }: MapLayerToggleProps) {
  const [activeTab, setActiveTab] = useState<'layers' | 'sensors' | 'netdata'>('layers');
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  
  const [sensors, setSensors] = useState<WaterSensor[]>(() =>
    initializeSensors().filter((s) => STRATEGIC_SENSOR_IDS.has(s.id)),
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scenarioId] = useState<WeatherScenarioId>('heavy_monsoon');

  
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

  
  const [netNodes, setNetNodes] = useState<NetworkNode[]>(() => initializeNetworkNodes());
  const [netScenarioId, setNetScenarioId] = useState<NetworkScenarioId>('monsoon_power_outage');
  const [netFilterType, setNetFilterType] = useState<string>('all');
  const [selectedNetNodeId, setSelectedNetNodeId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNetNodes((prev) => stepNetworkSimulation(prev, netScenarioId, 15));
    }, 2000);
    return () => clearInterval(timer);
  }, [netScenarioId]);

  const netSummary = useMemo(() => computeNetworkSummary(netNodes), [netNodes]);
  const netAlertCount = netSummary.blackoutCount + netSummary.criticalCount + netSummary.degradedCount;

  const filteredNetNodes = useMemo(() => {
    if (netFilterType === 'all') return netNodes;
    if (netFilterType === 'alerts') return netNodes.filter((n) => n.status !== 'optimal');
    return netNodes.filter((n) => n.type === netFilterType);
  }, [netNodes, netFilterType]);

  const expanded = isHovered || isPinned;

  const handleSelectTab = (tab: 'layers' | 'sensors' | 'netdata') => {
    setActiveTab(tab);
    const next = new Set(visibleLayers);
    if (tab === 'sensors') {
      next.add('sensors');
      next.delete('netdata');
    } else if (tab === 'netdata') {
      next.add('netdata');
      next.delete('sensors');
    } else if (tab === 'layers') {
      next.delete('sensors');
      next.delete('netdata');
    }
    onChange(next);
  };

  const toggleLayer = (layer: MapLayer) => {
    const next = new Set(visibleLayers);
    if (next.has(layer)) {
      next.delete(layer);
    } else {
      next.add(layer);
    }
    onChange(next);
    if (layer === 'netdata') {
      handleSelectTab('netdata');
    } else if (layer === 'sensors') {
      handleSelectTab('sensors');
    }
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative z-20 flex shrink-0 flex-col justify-between bg-brand-bg select-none transition-all duration-200 ease-in-out border-b lg:border-b-0 lg:border-r border-struct-line/50 ${
        expanded ? 'w-full lg:w-80 shadow-2xl' : 'w-full lg:w-16'
      }`}
    >
      {}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden p-2.5 gap-2.5">
        {}
        <div className="flex items-center justify-between border-b border-struct-line/60 pb-2 px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-struct-line bg-base-cream rounded-xl text-signal-accent shadow-sm">
              {activeTab === 'layers' ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              ) : activeTab === 'sensors' ? (
                <svg className="w-4 h-4 text-signal-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.5c-4.142 0-7.5-3.358-7.5-7.5C4.5 9.385 12 2.5 12 2.5S19.5 9.385 19.5 14c0 4.142-3.358 7.5-7.5 7.5z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-signal-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z" />
                  <path d="M12 6a6 6 0 0 1 6 6c0 3.314-2.686 6-6 6s-6-2.686-6-6a6 6 0 0 1 6-6z" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              )}
            </div>
            {expanded && (
              <div className="flex flex-col overflow-hidden whitespace-nowrap">
                <span className="font-display text-[10px] font-black tracking-widest text-base-dark uppercase leading-none">
                  {activeTab === 'layers' ? 'MAP LAYERS' : activeTab === 'sensors' ? 'HYDRO SENSORS' : 'NETWORK DATA'}
                </span>
                <span className="font-mono text-[8px] text-base-dark/60 mt-0.5">
                  {activeTab === 'layers'
                    ? `${visibleLayers.size}/${LAYERS.length} VISIBLE`
                    : activeTab === 'sensors'
                    ? `${activeAlertCount} ACTIVE ALERTS`
                    : `${netSummary.totalNodes} NODES (${netAlertCount} STRESSED)`}
                </span>
              </div>
            )}
          </div>

          {}
          {expanded && (
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Unpin sidebar (auto-collapse)' : 'Pin sidebar expanded'}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] transition-all cursor-pointer ${
                isPinned
                  ? 'border-signal-accent bg-signal-accent/30 text-base-dark'
                  : 'border-struct-line bg-base-cream text-base-dark/70 hover:text-base-dark'
              }`}
            >
              {isPinned ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 17V3m-5 9h10M9 8h6" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              )}
            </button>
          )}
        </div>

        {}
        {expanded ? (
          
          <div className="flex border border-struct-line bg-base-sand p-1 rounded-xl shrink-0 gap-1">
            <button
              type="button"
              onClick={() => handleSelectTab('layers')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-display font-black tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'layers'
                  ? 'bg-signal-accent text-white font-bold shadow-sm'
                  : 'text-base-dark/70 hover:text-base-dark'
              }`}
              title="Map Layer Controls"
            >
              LAYERS
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('sensors')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-display font-black tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'sensors'
                  ? 'bg-signal-accent text-white font-bold shadow-sm'
                  : 'text-base-dark/70 hover:text-base-dark'
              }`}
              title="Water Level Telemetry Sensors"
            >
              <span>HYDRO</span>
              {activeAlertCount > 0 && (
                <span className={`px-1 py-0.1 rounded-full text-[7px] font-mono font-bold ${
                  activeTab === 'sensors' ? 'bg-black text-white' : 'bg-status-danger text-white animate-pulse'
                }`}>
                  {activeAlertCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('netdata')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-display font-black tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'netdata'
                  ? 'bg-signal-accent text-white font-bold shadow-sm'
                  : 'text-base-dark/70 hover:text-base-dark'
              }`}
              title="Network & Telecommunications Telemetry Data at Nodes"
            >
              <span>NET DATA</span>
              {netAlertCount > 0 && (
                <span className={`px-1 py-0.1 rounded-full text-[7px] font-mono font-bold ${
                  activeTab === 'netdata' ? 'bg-black text-white' : 'bg-status-warn text-white'
                }`}>
                  {netAlertCount}
                </span>
              )}
            </button>
          </div>
        ) : (
          
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectTab('layers')}
              className={`flex h-9 w-full items-center justify-center rounded-xl border transition-all ${
                activeTab === 'layers'
                  ? 'border-signal-accent bg-signal-accent/30 text-base-dark'
                  : 'border-struct-line bg-base-cream text-base-dark/70 hover:text-base-dark'
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
              onClick={() => handleSelectTab('sensors')}
              className={`relative flex h-9 w-full items-center justify-center rounded-xl border transition-all cursor-pointer ${
                activeTab === 'sensors'
                  ? 'border-signal-accent bg-signal-accent/30 text-base-dark'
                  : 'border-struct-line bg-base-cream text-base-dark/70 hover:text-base-dark'
              }`}
              title="Switch to Water Level Sensors"
            >
              <svg className="w-4 h-4 text-signal-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.5c-4.142 0-7.5-3.358-7.5-7.5C4.5 9.385 12 2.5 12 2.5S19.5 9.385 19.5 14c0 4.142-3.358 7.5-7.5 7.5z" />
              </svg>
              {activeAlertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-status-danger animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('netdata')}
              className={`relative flex h-9 w-full items-center justify-center rounded-xl border transition-all cursor-pointer ${
                activeTab === 'netdata'
                  ? 'border-signal-accent bg-signal-accent/30 text-base-dark'
                  : 'border-struct-line bg-base-cream text-base-dark/70 hover:text-base-dark'
              }`}
              title="Switch to Network & Telecommunications Data"
            >
              <svg className="w-4 h-4 text-signal-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z" />
                <path d="M12 6a6 6 0 0 1 6 6c0 3.314-2.686 6-6 6s-6-2.686-6-6a6 6 0 0 1 6-6z" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
              {netAlertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-status-warn animate-pulse" />
              )}
            </button>
          </div>
        )}

        {}
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
                      ? 'border-signal-accent bg-base-sand text-base-dark font-bold shadow-sm'
                      : 'border-struct-line bg-base-cream text-base-dark/60 hover:text-base-dark hover:bg-base-sand opacity-70 hover:opacity-100'
                  }`}
                  title={`Toggle ${layer.label} (${isVisible ? 'Active' : 'Hidden'})`}
                >
                  {}
                  <div className="flex shrink-0 items-center justify-center">
                    {layer.icon(isVisible)}
                  </div>

                  {}
                  {expanded && (
                    <div className="flex flex-1 items-center justify-between overflow-hidden whitespace-nowrap text-left">
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="font-display text-[11px] font-bold tracking-wider leading-none truncate">
                          {layer.label}
                        </span>
                        <span className="font-mono text-[9px] text-base-dark/60 mt-0.5 truncate">
                          {layer.sublabel}
                        </span>
                      </div>

                      {}
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isVisible
                              ? 'bg-status-ok shadow-[0_0_6px_#206E6B]'
                              : 'bg-struct-line'
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

        {}
        {activeTab === 'sensors' && (
          <div className="flex flex-col min-h-0 flex-1 gap-2 overflow-hidden">
            {}
            {expanded && (
              <div className="flex flex-col gap-2 border border-struct-line bg-base-sand p-2.5 rounded-2xl shrink-0">
                <div className="flex items-center justify-between text-[8px] font-mono">
                  <span className="text-signal-accent font-bold uppercase tracking-wider">
                    PERIYAR BASIN TELEMETRY
                  </span>
                  <span className="text-base-dark font-bold">
                    {submergedCount > 0 ? (
                      <span className="text-status-danger flex items-center gap-1">
                        <svg className="w-3 h-3 shrink-0 text-status-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {submergedCount} SUBMERGED
                      </span>
                    ) : (
                      <span className="text-status-ok">ROADS CLEAR</span>
                    )}
                  </span>
                </div>

                {}
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[8px] pt-0.5">
                  <div className="border border-struct-line bg-base-cream py-1 px-1 rounded-xl">
                    <span className="text-base-dark/60 block text-[7px] uppercase">MAX STAGE</span>
                    <span className="font-bold text-base-dark text-[9px]">{summary.maxWaterLevelM.toFixed(1)}m</span>
                  </div>
                  <div className="border border-struct-line bg-base-cream py-1 px-1 rounded-xl">
                    <span className="text-base-dark/60 block text-[7px] uppercase">ALERTS</span>
                    <span className={`font-bold text-[9px] ${activeAlertCount > 0 ? 'text-status-danger' : 'text-status-ok'}`}>
                      {activeAlertCount} / {sensors.length}
                    </span>
                  </div>
                  <div className="border border-struct-line bg-base-cream py-1 px-1 rounded-xl">
                    <span className="text-base-dark/60 block text-[7px] uppercase">AVG RISE</span>
                    <span className="font-bold text-status-warn text-[9px]">
                      +{summary.averageRiseRateMps.toFixed(2)}m/h
                    </span>
                  </div>
                </div>

                {}
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
                      className={`flex-1 py-1 rounded-lg text-[7px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                        statusFilter === f.id
                          ? 'border-signal-accent bg-signal-accent/30 text-base-dark font-bold'
                          : 'border-struct-line bg-base-cream text-base-dark/70 hover:text-base-dark'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5">
              {displayedSensors.map((sensor) => {
                const styles = STATUS_COLOR_MAP[sensor.status];
                const pct = Math.min(100, Math.round((sensor.currentLevelM / sensor.criticalLevelM) * 100));

                return (
                  <div
                    key={sensor.id}
                    className={`border p-2.5 bg-base-sand rounded-2xl flex flex-col gap-2 transition-all ${
                      sensor.status === 'critical'
                        ? 'border-[#997460] shadow-[0_0_12px_rgba(153,116,96,0.15)]'
                        : sensor.status === 'warning'
                        ? 'border-[#6AADAB] shadow-[0_0_10px_rgba(106,173,171,0.1)]'
                        : 'border-struct-line'
                    }`}
                  >
                    {!expanded ? (
                      <div
                        className="flex flex-col items-center justify-center py-1 gap-1"
                        title={`${sensor.name} (${sensor.code}): ${sensor.currentLevelM.toFixed(1)}m — ${sensor.status.toUpperCase()}`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${styles.bar}`} />
                        <span className="font-mono text-[7px] text-base-dark font-bold">{sensor.currentLevelM.toFixed(1)}m</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[10px] font-bold text-signal-accent shrink-0">
                              {sensor.code}
                            </span>
                            <span className="font-display text-[11px] font-bold text-base-dark truncate">
                              {sensor.name}
                            </span>
                          </div>
                          <span className={`border px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase shrink-0 ${styles.badge}`}>
                            {sensor.status}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-baseline justify-between font-mono text-[10px]">
                            <div className="flex items-center gap-1">
                              <span className={`text-[13px] font-black ${styles.text}`}>
                                {sensor.currentLevelM.toFixed(2)}m
                              </span>
                              <span className="text-[9px] text-base-dark/60">
                                / {sensor.criticalLevelM.toFixed(1)}m CREST
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-base-dark/80">
                              <span className={sensor.rateOfRiseMPerHour > 0.3 ? 'text-status-warn font-bold' : 'text-base-dark/80'}>
                                {sensor.rateOfRiseMPerHour > 0 ? `▲ +${sensor.rateOfRiseMPerHour.toFixed(2)}m/h` : `▼ ${sensor.rateOfRiseMPerHour.toFixed(2)}m/h`}
                              </span>
                            </div>
                          </div>

                          <div className="h-2 w-full bg-base-cream border border-struct-line rounded-full flex overflow-hidden p-0.5">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${styles.bar}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {sensor.roadSubmersionDepthM > 0 ? (
                          <div className="border border-[#997460]/60 bg-[#997460]/15 px-2 py-1 rounded-xl text-[9px] font-mono text-base-dark flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <svg className="w-2.5 h-2.5 shrink-0 text-status-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              INUNDATION: +{sensor.roadSubmersionDepthM.toFixed(2)}m
                            </span>
                            <span className="text-base-dark/70 uppercase truncate max-w-[90px]">{sensor.basinSection}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center font-mono text-[9px] text-base-dark/70 pt-0.5">
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

        {}
        {activeTab === 'netdata' && (
          <div className="flex flex-col min-h-0 flex-1 gap-2 overflow-hidden">
            {expanded && (
              <div className="flex flex-col gap-2 border border-struct-line bg-base-sand p-2.5 rounded-2xl shrink-0">
                {}
                <div className="flex flex-col gap-1 border-b border-struct-line/50 pb-2">
                  <label className="text-[8px] font-mono text-signal-accent font-bold uppercase tracking-wider">
                    DISASTER TELECOM SCENARIO
                  </label>
                  <select
                    value={netScenarioId}
                    onChange={(e) => setNetScenarioId(e.target.value as NetworkScenarioId)}
                    className="border border-struct-line bg-base-cream px-2 py-1 rounded-xl text-[10px] font-mono text-base-dark outline-none focus:border-signal-accent"
                  >
                    {(Object.keys(NETWORK_SCENARIOS) as NetworkScenarioId[]).map((key) => (
                      <option key={key} value={key}>
                        {NETWORK_SCENARIOS[key].name}
                      </option>
                    ))}
                  </select>
                </div>

                {}
                <div className="grid grid-cols-3 gap-1 text-center font-mono text-[8px]">
                  <div className="border border-struct-line bg-base-cream py-1 px-1 rounded-xl">
                    <span className="text-base-dark/60 block text-[7px] uppercase">STATIONS</span>
                    <span className="font-bold text-base-dark text-[9px]">{netSummary.totalNodes}</span>
                  </div>
                  <div className="border border-struct-line bg-base-cream py-1 px-1 rounded-xl">
                    <span className="text-base-dark/60 block text-[7px] uppercase">OPTIMAL</span>
                    <span className="font-bold text-status-ok text-[9px]">{netSummary.optimalCount}</span>
                  </div>
                  <div className="border border-struct-line bg-base-cream py-1 px-1 rounded-xl">
                    <span className="text-base-dark/60 block text-[7px] uppercase">STRESSED</span>
                    <span className={`font-bold text-[9px] ${netAlertCount > 0 ? 'text-status-danger' : 'text-status-ok'}`}>
                      {netAlertCount}
                    </span>
                  </div>
                </div>

                {}
                <div className="flex gap-1 pt-0.5">
                  {[
                    { id: 'all', label: `ALL (${netNodes.length})` },
                    { id: 'alerts', label: `ALERTS (${netAlertCount})` },
                    { id: 'depot', label: `DEPOTS` },
                    { id: 'shelter', label: `SHELTERS` },
                    { id: 'village', label: `VILLAGES` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setNetFilterType(f.id)}
                      className={`flex-1 py-0.5 rounded-lg text-[7px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                        netFilterType === f.id
                          ? 'border-signal-accent bg-signal-accent/30 text-base-dark font-bold'
                          : 'border-struct-line bg-base-cream text-base-dark/70 hover:text-base-dark'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5">
              {filteredNetNodes.map((node) => {
                const styles = NET_STATUS_BADGE[node.status];
                const isSelected = node.id === selectedNetNodeId;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNetNodeId(isSelected ? null : node.id)}
                    className={`border p-2.5 bg-base-sand rounded-2xl flex flex-col gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-signal-accent bg-signal-accent/10 shadow-[0_0_12px_rgba(32,110,107,0.2)]'
                        : node.status === 'blackout'
                        ? 'border-status-danger/70 shadow-[0_0_8px_rgba(220,38,38,0.15)]'
                        : node.status === 'critical_drop' || node.status === 'degraded'
                        ? 'border-status-warn/70'
                        : 'border-struct-line hover:border-signal-accent/50'
                    }`}
                  >
                    {!expanded ? (
                      <div
                        className="flex flex-col items-center justify-center py-1 gap-1"
                        title={`${node.name} (${node.code}): ${node.latencyMs}ms ping, ${node.packetLossPct}% loss — ${styles.label}`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${styles.bar}`} />
                        <span className="font-mono text-[7px] text-base-dark font-bold">{node.latencyMs}ms</span>
                      </div>
                    ) : (
                      <>
                        {}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[10px] font-bold text-signal-accent shrink-0">
                              {node.code}
                            </span>
                            <span className="font-display text-[11px] font-bold text-base-dark truncate">
                              {node.name}
                            </span>
                          </div>
                          <span className={`border px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase shrink-0 ${styles.badge}`}>
                            {styles.label}
                          </span>
                        </div>

                        {}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-baseline justify-between font-mono text-[9px]">
                            <span className="text-base-dark/70 truncate max-w-[170px]" title={node.activeChannel}>
                              📡 {node.activeChannel}
                            </span>
                            <span className="font-bold text-signal-accent shrink-0">
                              {node.latencyMs}ms | {node.packetLossPct}% loss
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1 font-mono text-[8px] text-base-dark/80 pt-0.5">
                            <div className="border border-struct-line/60 bg-base-cream px-1 py-0.5 rounded text-center">
                              <span className="text-base-dark/60 block text-[6px]">BANDWIDTH</span>
                              <span className="font-bold text-base-dark">{node.bandwidthMbps} Mbps</span>
                            </div>
                            <div className="border border-struct-line/60 bg-base-cream px-1 py-0.5 rounded text-center">
                              <span className="text-base-dark/60 block text-[6px]">SIGNAL</span>
                              <span className="font-bold text-base-dark">{node.signalDbm} dBm</span>
                            </div>
                            <div className="border border-struct-line/60 bg-base-cream px-1 py-0.5 rounded text-center">
                              <span className="text-base-dark/60 block text-[6px]">POWER</span>
                              <span className={`font-bold ${node.powerSource === 'Power Failed' ? 'text-status-danger' : node.powerSource === 'Battery Backup' ? 'text-status-warn' : 'text-status-ok'}`}>
                                {node.batteryHoursRemaining > 0 ? `${node.batteryHoursRemaining.toFixed(1)}h bat` : 'Grid'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {}
                        {isSelected && (
                          <div className="border-t border-struct-line/50 pt-1.5 mt-1 flex flex-col gap-1 text-[8px] font-mono animate-in fade-in">
                            <div className="flex justify-between text-base-dark/80">
                              <span>FALLBACK: {node.fallbackChannel}</span>
                              <span>DEVICES: {node.connectedDevices}</span>
                            </div>
                            <div className="text-base-dark/60 italic text-[7.5px] line-clamp-2">
                              Peers ({node.meshPeers.length}): {node.meshPeers.join(', ')}
                            </div>
                            {node.notes && (
                              <div className="text-signal-accent text-[7.5px] border-t border-struct-line/30 pt-0.5">
                                Note: {node.notes}
                              </div>
                            )}
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
    </aside>
  );
}
