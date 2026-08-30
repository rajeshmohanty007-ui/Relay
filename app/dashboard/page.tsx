'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFirestoreCollection } from '../../src/hooks/useFirestoreCollection';
import { useReplayBuffer } from '../../src/hooks/useReplayBuffer';
import type { Node, Edge, Convoy, DemoLogEntry, DemoConfig } from '../../src/lib/types';
import MapViewTopo, { ALL_MAP_LAYERS, type MapLayer } from '../../src/components/MapViewTopo';

// Leaflet touches `window` on import, so the realistic map must never render on the server.
const MapViewGeo = dynamic(() => import('../../src/components/MapViewGeo'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-[#E4E1D8]/50">
      LOADING REALISTIC MAP…
    </div>
  ),
});
import DispatchPanelPlacard from '../../src/components/DispatchPanelPlacard';
import EventFeedDispatcher from '../../src/components/EventFeedDispatcher';
import ReplayTimeline from '../../src/components/ReplayTimeline';
import MapLayerToggle from '../../src/components/MapLayerToggle';
import GrievanceFormModal from '../../src/components/GrievanceFormModal';
import RoutePlannerModal from '../../src/components/RoutePlannerModal';
import { loadSavedCitizenRoute, clearSavedCitizenRoute } from '../../src/lib/CitizenRouteStorage';
import { initializeSensors, stepSensorSimulation, type WaterSensor } from '../../src/lib/waterSensors';

const STRATEGIC_SENSOR_IDS = new Set([
  'ws_periyar_dam_01',
  'ws_central_bridge_07',
  'ws_canal_sluice_12',
  'ws_causeway_haven_14',
  'ws_west_culvert_15',
  'ws_delta_stadium_17',
]);



export default function DashboardPage() {
  const [mode, setMode] = useState<'LIVE' | 'REPLAY'>('LIVE');
  const [mapStyle, setMapStyle] = useState<'TACTICAL' | 'REALISTIC'>('REALISTIC');
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(0);
  const [visibleLayers, setVisibleLayers] = useState<Set<MapLayer>>(ALL_MAP_LAYERS);
  const [isFlightLogOpen, setIsFlightLogOpen] = useState<boolean>(false);
  const [isGrievanceOpen, setIsGrievanceOpen] = useState<boolean>(false);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState<boolean>(false);
  const [highlightedRouteEdgeIds, setHighlightedRouteEdgeIds] = useState<Set<string> | undefined>(undefined);
  const [highlightedRouteNodeSeq, setHighlightedRouteNodeSeq] = useState<string[] | undefined>(undefined);
  const [routeOriginId, setRouteOriginId] = useState<string>('');
  const [routeDestId, setRouteDestId] = useState<string>('');
  const [isMobileLayersOpen, setIsMobileLayersOpen] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = loadSavedCitizenRoute();
      if (saved) {
        setRouteOriginId(saved.originId);
        setRouteDestId(saved.destId);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Live water level telemetry simulation for the tactical map feed
  const [sensors, setSensors] = useState<WaterSensor[]>(() =>
    initializeSensors().filter((s) => STRATEGIC_SENSOR_IDS.has(s.id)),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setSensors((prev) => stepSensorSimulation(prev, 'heavy_monsoon', 15));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const { data: nodes, loading: nodesLoading } = useFirestoreCollection<Node>('nodes');
  const { data: edges, loading: edgesLoading } = useFirestoreCollection<Edge>('edges');
  const { data: convoys, loading: convoysLoading } = useFirestoreCollection<Convoy>('convoys');
  const { data: demoLog, loading: demoLogLoading } = useFirestoreCollection<DemoLogEntry>('demoLog', 'simTimeSec');
  const { data: demoConfigs } = useFirestoreCollection<DemoConfig>('demoConfig');

  const mapReady = !nodesLoading && !edgesLoading && !convoysLoading;
  const activeConfig = demoConfigs?.[0];
  const scenarioName = activeConfig?.scenarioName || "Aluva-Periyar River Flood Relief Basin (Monsoon Crisis)";

  // Compute live elapsed simulation time
  const liveElapsedSeconds = demoLog.length > 0
    ? Math.max(...demoLog.map(l => l.simTimeSec))
    : 0;

  // Buffer live Firestore streams
  const { availableTimes, getSnapshotByIndex, bufferSize } = useReplayBuffer(nodes, edges, convoys, liveElapsedSeconds);

  // When in LIVE mode, automatically follow the latest available index.
  // In REPLAY mode, use the manually scrubbed index.
  const activeIndex = mode === 'LIVE'
    ? Math.max(0, bufferSize - 1)
    : Math.min(selectedTimeIndex, Math.max(0, bufferSize - 1));

  // Determine current active snapshot data from the buffer
  const activeSnapshot = mode === 'REPLAY' ? getSnapshotByIndex(activeIndex) : null;
  const scrubbedTime = activeSnapshot ? activeSnapshot.simTimeSec : liveElapsedSeconds;

  const displayNodes = activeSnapshot ? activeSnapshot.nodes : nodes;
  const displayEdges = activeSnapshot ? activeSnapshot.edges : edges;
  const displayConvoys = activeSnapshot ? activeSnapshot.convoys : convoys;
  const displayDemoLog = mode === 'REPLAY'
    ? demoLog.filter((entry) => entry.simTimeSec <= scrubbedTime)
    : demoLog;


  // Calculate stats for the tactical header based on current displayed state
  const activeConvoys = displayConvoys.filter(c => c.status === 'enroute' || c.status === 'rerouted').length;
  const blockedRoads = displayEdges.filter(e => e.status === 'blocked').length;
  const criticalShelters = displayNodes.filter(n => n.type === 'shelter' && n.criticalSupplyNeed && n.criticalSupplyNeed.hoursOfStockRemaining <= 3.0).length;

  // Citizen active planned route card to render inside replay timeline next to Tick indicator
  const hasActiveRoute = !!(routeOriginId && routeDestId && highlightedRouteEdgeIds && highlightedRouteEdgeIds.size > 0);
  let plannedRouteCard: React.ReactNode = null;

  if (hasActiveRoute) {
    const originNode = displayNodes.find(n => n.id === routeOriginId);
    const destNode = displayNodes.find(n => n.id === routeDestId);
    const originName = originNode?.name.replace(' Relief Shelter', '').replace(' Logistics Depot', '').replace(' Emergency Shelter', '') ?? routeOriginId;
    const destName = destNode?.name.replace(' Relief Shelter', '').replace(' Logistics Depot', '').replace(' Emergency Shelter', '') ?? routeDestId;

    plannedRouteCard = (
      <div className="flex items-center gap-2 rounded-full border border-signal-accent bg-base-cream px-2.5 py-0.5 shadow-xs animate-in fade-in duration-200">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#EC4899] shadow-[0_0_6px_#EC4899]" />
        <span className="font-mono text-[9px] text-base-dark tracking-wide">
          <span className="font-black">{originName}</span> → <span className="font-black">{destName}</span>
        </span>
        <button
          type="button"
          onClick={() => setIsRoutePlannerOpen(true)}
          className="ml-1 rounded-md border border-struct-line bg-base-sand px-1.5 py-0.5 font-mono text-[8px] font-bold text-base-dark hover:border-signal-accent transition-all cursor-pointer"
        >
          ADJUST
        </button>
        <button
          type="button"
          onClick={() => {
            setRouteOriginId('');
            setRouteDestId('');
            setHighlightedRouteEdgeIds(undefined);
            setHighlightedRouteNodeSeq(undefined);
            clearSavedCitizenRoute();
          }}
          className="rounded-md border border-status-danger bg-status-danger/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-status-danger hover:bg-status-danger/20 transition-all cursor-pointer"
        >
          CLEAR
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen xl:h-screen w-full flex-col bg-base-cream text-base-dark font-sans overflow-y-auto xl:overflow-hidden">
      {/* Tactical Header Strip */}
      <header className="relative z-30 border-b border-struct-line bg-base-sand/90 backdrop-blur-md px-3 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/drawing.svg" alt="Relay Logo" className="h-8 w-auto block" />
            <div>
              <p className="text-[10px] font-sans text-base-dark/70 tracking-wide uppercase">
                SCENARIO: <span className="text-signal-accent font-semibold">{scenarioName}</span>
              </p>
            </div>
          </div>
        </div>


        {/* Mode Toggle, Flight Log, Grievance Trigger & Mission Clock */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Grievance / Emergency Road Blockage Report Button */}
          <button
            type="button"
            onClick={() => setIsGrievanceOpen(true)}
            className="flex items-center gap-1.5 border border-status-danger bg-status-danger/15 px-3 py-1.5 rounded-xl text-[10px] font-display font-black tracking-wider uppercase text-status-danger hover:bg-status-danger/30 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_10px_rgba(153,116,96,0.25)] cursor-pointer"
            title="Report Blocked Road & Request Priority Rescue Dispatch"
          >
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="hidden sm:inline">REPORT BLOCKAGE</span>
            </span>
          </button>

          {/* Citizen Route Planner Trigger Button */}
          <button
            type="button"
            onClick={() => setIsRoutePlannerOpen(true)}
            className="flex items-center gap-1.5 border border-signal-accent bg-signal-accent/15 px-3 py-1.5 rounded-xl text-[10px] font-display font-black tracking-wider uppercase text-signal-accent hover:bg-signal-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            title="Plan a safe route between any two points"
          >
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" />
              </svg>
              <span className="hidden sm:inline">PLAN A ROUTE</span>
            </span>
          </button>

          {/* Flight Log Navbar Modal Trigger Button */}
          <button
            type="button"
            onClick={() => setIsFlightLogOpen(true)}
            className="flex items-center gap-2 border border-struct-line bg-base-cream px-3 py-1.5 rounded-xl text-[10px] font-display font-bold tracking-wider uppercase text-base-dark hover:text-base-dark hover:border-signal-accent hover:bg-base-sand transition-all cursor-pointer"
            title="Open Dispatcher Flight Log"
          >
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h6m-6 4h6" />
              </svg>
              <span className="hidden sm:inline">FLIGHT LOG</span>
            </span>
            <span className="bg-base-sand border border-struct-line text-signal-accent px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold">
              {displayDemoLog.length}
            </span>
          </button>

          {/* Map Style Switch */}
          <div className="flex border border-struct-line bg-base-cream p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMapStyle('TACTICAL')}
              className={`px-3 py-1 rounded-lg text-[10px] font-display font-bold tracking-wider uppercase transition-all cursor-pointer ${mapStyle === 'TACTICAL'
                ? 'bg-signal-accent text-white font-black shadow-sm'
                : 'text-base-dark/60 hover:text-base-dark'
                }`}
              title="Stylized tactical map (no internet required)"
            >
              TACTICAL
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('REALISTIC')}
              className={`px-3 py-1 rounded-lg text-[10px] font-display font-bold tracking-wider uppercase transition-all cursor-pointer ${mapStyle === 'REALISTIC'
                ? 'bg-signal-accent text-white font-black shadow-sm'
                : 'text-base-dark/60 hover:text-base-dark'
                }`}
              title="Real satellite/street map with road-snapped routes (needs internet)"
            >
              REALISTIC
            </button>
          </div>

          {/* Mode Switch */}
          <div className="flex border border-struct-line bg-base-cream p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('LIVE');
                if (bufferSize > 0) {
                  setSelectedTimeIndex(bufferSize - 1);
                }
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-display font-bold tracking-wider uppercase transition-all cursor-pointer ${mode === 'LIVE'
                ? 'bg-status-ok text-white font-black shadow-sm'
                : 'text-base-dark/60 hover:text-base-dark'
                }`}
            >
              LIVE
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REPLAY');
                if (bufferSize > 0) {
                  setSelectedTimeIndex(bufferSize - 1);
                }
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-display font-bold tracking-wider uppercase transition-all cursor-pointer ${mode === 'REPLAY'
                ? 'bg-status-warn text-white font-black shadow-sm'
                : 'text-base-dark/60 hover:text-base-dark'
                }`}
            >
              REPLAY
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex min-h-0 flex-1 bg-base-cream gap-2 p-2 flex-col xl:flex-row overflow-y-auto xl:overflow-hidden">
        {/* Left Collapsible Layer Sidebar — hidden on mobile, shown on xl */}
        <div className="hidden xl:flex rounded-2xl border border-struct-line bg-brand-bg overflow-hidden shadow-lg shrink-0">
          <MapLayerToggle
            visibleLayers={visibleLayers}
            onChange={setVisibleLayers}
          />
        </div>

        {/* Central Tactical Area (Map + Scrubber) */}
        <main className="min-w-0 flex-1 flex flex-col gap-2">
          <div className={`relative z-0 h-[50vh] sm:h-[55vh] md:h-[60vh] xl:flex-1 xl:h-auto bg-base-cream rounded-2xl border overflow-hidden shadow-lg transition-all ${mode === 'REPLAY' ? 'border-status-warn/60 ring-1 ring-status-warn/20' : 'border-struct-line'}`}>
            {/* Replay Mode Indicator Badge */}
            {mode === 'REPLAY' && (
              <div className="absolute top-3 left-3 z-10 border border-status-warn bg-base-cream/95 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-display font-black tracking-widest text-status-warn shadow-[0_0_12px_rgba(184,134,59,0.3)] flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-status-warn animate-ping" />
                <span>HISTORICAL REPLAY — FRAME {activeIndex + 1}/{bufferSize}</span>
              </div>
            )}
            {mapReady ? (
              mapStyle === 'TACTICAL' ? (
                <MapViewTopo
                  nodes={displayNodes}
                  edges={displayEdges}
                  convoys={displayConvoys}
                  sensors={sensors}
                  visibleLayers={visibleLayers}
                  highlightedEdgeIds={highlightedRouteEdgeIds}
                  routeOriginId={routeOriginId}
                  routeDestId={routeDestId}
                />
              ) : (
                <MapViewGeo
                  nodes={displayNodes}
                  edges={displayEdges}
                  convoys={displayConvoys}
                  sensors={sensors}
                  visibleLayers={visibleLayers}
                  highlightedNodeSequence={highlightedRouteNodeSeq}
                  routeOriginId={routeOriginId}
                  routeDestId={routeDestId}
                />
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-base-dark/50">
                INITIALIZING TACTICAL GRAPH MAP...
              </div>
            )}
          </div>

          {/* Timeline Scrubber Bar */}
          <div className="relative z-10 rounded-2xl overflow-hidden shadow-lg">
            <ReplayTimeline
              availableTimes={availableTimes}
              selectedIndex={activeIndex}
              mode={mode}
              onSelectIndex={(idx) => {
                setSelectedTimeIndex(idx);
              }}
              onToggleMode={(newMode) => {
                setMode(newMode);
              }}
              plannedRouteCard={plannedRouteCard}
            />
          </div>
        </main>

        {/* Right Info Sidebar Panels */}
        <aside className="flex w-full xl:w-88 shrink-0 flex-col rounded-2xl border border-struct-line bg-brand-bg p-3 shadow-lg gap-3 max-h-[50vh] xl:max-h-none xl:overflow-hidden overflow-y-auto">
          {/* Tactical Counters Summary Card */}
          <div className="flex flex-col gap-2 bg-base-cream border border-struct-line/60 rounded-2xl p-3 shrink-0 shadow-inner">
            <div className="flex items-center justify-between border-b border-struct-line/30 pb-1.5">
              <span className="font-display text-[9px] font-black tracking-widest text-base-dark/60 uppercase">SYSTEM TELEMETRY SUMMARY</span>
            </div>

            <div className="flex items-center justify-between font-mono text-[10px] py-1 border-b border-struct-line/10">
              <span className="text-base-dark/60">ACTIVE OPERATIONS</span>
              <span className="font-bold text-signal-accent tracking-wider font-mono text-xs">{activeConvoys} CONVOYS</span>
            </div>

            <div className="flex items-center justify-between font-mono text-[10px] py-1 border-b border-struct-line/10">
              <span className="text-base-dark/60">HAZARD INTERRUPTS</span>
              <span className={`font-bold tracking-wider font-mono text-xs ${blockedRoads > 0 ? 'text-status-danger' : 'text-base-dark/60'}`}>
                {blockedRoads} BLOCKED
              </span>
            </div>

            <div className="flex items-center justify-between font-mono text-[10px] py-1">
              <span className="text-base-dark/60">ALERT LEVEL SHELTERS</span>
              <span className={`font-bold tracking-wider font-mono text-xs ${criticalShelters > 0 ? 'text-status-danger animate-pulse' : 'text-status-ok'}`}>
                {criticalShelters} CRITICAL
              </span>
            </div>
          </div>

          {/* Dispatch Panel (Full Height) */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
            {mapReady ? (
              <DispatchPanelPlacard nodes={displayNodes} convoys={displayConvoys} demoLog={displayDemoLog} />
            ) : (
              <div className="font-mono text-xs text-base-dark/50">LOADING DISPATCH DATABASES...</div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Map Layers Drawer */}
      {isMobileLayersOpen && (
        <div className="fixed inset-0 z-[9999] xl:hidden flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileLayersOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] h-full bg-brand-bg border-r border-struct-line shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-struct-line bg-base-sand">
              <span className="font-display text-[10px] font-black tracking-widest text-base-dark uppercase">MAP LAYERS</span>
              <button
                type="button"
                onClick={() => setIsMobileLayersOpen(false)}
                className="rounded-lg border border-struct-line bg-base-cream px-2.5 py-1 font-mono text-[10px] font-bold text-base-dark hover:border-signal-accent transition-all cursor-pointer"
              >
                CLOSE
              </button>
            </div>
            <MapLayerToggle
              visibleLayers={visibleLayers}
              onChange={setVisibleLayers}
            />
          </div>
        </div>
      )}

      {/* Mobile Layers Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsMobileLayersOpen(true)}
        className="fixed bottom-20 left-4 z-40 xl:hidden flex items-center justify-center w-12 h-12 rounded-full bg-signal-accent text-white shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white/30"
        title="Toggle Map Layers"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </button>

      {/* Dispatcher Flight Log Modal Dialog */}
      {isFlightLogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-struct-line bg-base-cream shadow-[0_0_40px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-struct-line bg-base-sand px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-signal-accent animate-pulse" />
                <h2 className="font-display text-xs font-black tracking-widest text-base-dark uppercase">
                  DISPATCHER FLIGHT LOG & INCIDENT FEED
                </h2>
                <span className="font-mono text-[9px] text-base-dark/60 rounded-full bg-base-cream px-2 py-0.5 border border-struct-line">
                  {displayDemoLog.length} EVENTS
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFlightLogOpen(false)}
                className="rounded-xl border border-struct-line bg-base-cream px-3 py-1 font-mono text-[10px] font-bold text-base-dark hover:text-base-dark hover:border-signal-accent transition-all cursor-pointer"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Modal Log Content */}
            <div className="flex-1 min-h-0 p-4 overflow-hidden">
              <EventFeedDispatcher entries={displayDemoLog} loading={demoLogLoading} />
            </div>
          </div>
        </div>
      )}

      {/* Citizen Road Grievance & Emergency Rescue Dispatch Modal */}
      <GrievanceFormModal
        isOpen={isGrievanceOpen}
        onClose={() => setIsGrievanceOpen(false)}
        edges={displayEdges}
        nodes={displayNodes}
      />

      {/* Citizen Point-to-Point Route Planner Modal */}
      <RoutePlannerModal
        isOpen={isRoutePlannerOpen}
        onClose={() => setIsRoutePlannerOpen(false)}
        onOpen={() => setIsRoutePlannerOpen(true)}
        nodes={displayNodes}
        edges={displayEdges}
        originId={routeOriginId}
        destId={routeDestId}
        onChangeOrigin={setRouteOriginId}
        onChangeDest={setRouteDestId}
        onHighlightRoute={(edgeIds, nodeSeq) => {
          setHighlightedRouteEdgeIds(edgeIds ? new Set(edgeIds) : undefined);
          setHighlightedRouteNodeSeq(nodeSeq ? nodeSeq : undefined);
        }}
      />
    </div>
  );
}
