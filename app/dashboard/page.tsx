'use client';

import { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../../src/hooks/useFirestoreCollection';
import { useReplayBuffer } from '../../src/hooks/useReplayBuffer';
import type { Node, Edge, Convoy, DemoLogEntry, DemoConfig } from '../../src/lib/types';
import MapViewTopo, { ALL_MAP_LAYERS, type MapLayer } from '../../src/components/MapViewTopo';
import DispatchPanelPlacard from '../../src/components/DispatchPanelPlacard';
import EventFeedDispatcher from '../../src/components/EventFeedDispatcher';
import ReplayTimeline from '../../src/components/ReplayTimeline';
import MapLayerToggle from '../../src/components/MapLayerToggle';
import GrievanceFormModal from '../../src/components/GrievanceFormModal';
import { initializeSensors, stepSensorSimulation, type WaterSensor } from '../../src/lib/waterSensors';

const STRATEGIC_SENSOR_IDS = new Set([
  'ws_periyar_dam_01',
  'ws_central_bridge_07',
  'ws_canal_sluice_12',
  'ws_causeway_haven_14',
  'ws_west_culvert_15',
  'ws_delta_stadium_17',
]);

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function DashboardPage() {
  const [mode, setMode] = useState<'LIVE' | 'REPLAY'>('LIVE');
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(0);
  const [visibleLayers, setVisibleLayers] = useState<Set<MapLayer>>(ALL_MAP_LAYERS);
  const [isFlightLogOpen, setIsFlightLogOpen] = useState<boolean>(false);
  const [isGrievanceOpen, setIsGrievanceOpen] = useState<boolean>(false);

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
  const displayClockSeconds = mode === 'REPLAY' ? scrubbedTime : liveElapsedSeconds;

  // Calculate stats for the tactical header based on current displayed state
  const activeConvoys = displayConvoys.filter(c => c.status === 'enroute' || c.status === 'rerouted').length;
  const blockedRoads = displayEdges.filter(e => e.status === 'blocked').length;
  const criticalShelters = displayNodes.filter(n => n.type === 'shelter' && n.criticalSupplyNeed && n.criticalSupplyNeed.hoursOfStockRemaining <= 3.0).length;

  return (
    <div className="flex h-screen w-screen flex-col bg-[#1C1B17] text-[#FAF9F6] font-sans overflow-hidden">
      {/* Tactical Header Strip */}
      <header className="border-b border-[#35332C] bg-[#24221D] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-display text-xs font-black tracking-widest text-[#FAF9F6] uppercase">
              RELAY OPERATION CONTROL
            </h1>
            <p className="text-[9px] font-sans text-[#E4E1D8]/70 tracking-wide uppercase mt-0.5">
              SCENARIO: <span className="text-signal-accent font-semibold">{scenarioName}</span>
            </p>
          </div>
        </div>

        {/* Tactical Counters */}
        <div className="hidden md:flex items-center gap-6 border-l border-r border-[#35332C]/60 px-6 py-0.5">
          <div className="font-mono text-[10px] leading-tight">
            <span className="text-[#E4E1D8]/60 block">ACTIVE OPERATIONS</span>
            <span className="font-bold text-signal-accent tracking-wider font-mono text-xs">{activeConvoys} CONVOYS</span>
          </div>
          <div className="font-mono text-[10px] leading-tight">
            <span className="text-[#E4E1D8]/60 block">HAZARD INTERRUPTS</span>
            <span className={`font-bold tracking-wider font-mono text-xs ${blockedRoads > 0 ? 'text-status-danger' : 'text-[#E4E1D8]/60'}`}>
              {blockedRoads} BLOCKED SECTIONS
            </span>
          </div>
          <div className="font-mono text-[10px] leading-tight">
            <span className="text-[#E4E1D8]/60 block">ALERT LEVEL SHELTERS</span>
            <span className={`font-bold tracking-wider font-mono text-xs ${criticalShelters > 0 ? 'text-status-danger animate-pulse' : 'text-status-ok'}`}>
              {criticalShelters} CRITICAL
            </span>
          </div>
        </div>

        {/* Mode Toggle, Flight Log, Grievance Trigger & Mission Clock */}
        <div className="flex items-center gap-3">
          {/* Grievance / Emergency Road Blockage Report Button */}
          <button
            type="button"
            onClick={() => setIsGrievanceOpen(true)}
            className="flex items-center gap-1.5 border border-[#A6403A] bg-[#A6403A]/15 px-2.5 py-1 text-[10px] font-display font-black tracking-wider uppercase text-[#A6403A] hover:bg-[#A6403A]/30 hover:text-white transition-all shadow-[0_0_8px_rgba(166,64,58,0.25)]"
            title="Report Blocked Road & Request Priority Rescue Dispatch"
          >
            <span>🚨 REPORT BLOCKAGE</span>
          </button>

          {/* Flight Log Navbar Modal Trigger Button */}
          <button
            type="button"
            onClick={() => setIsFlightLogOpen(true)}
            className="flex items-center gap-2 border border-[#35332C] bg-[#1C1B17] px-2.5 py-1 text-[10px] font-display font-bold tracking-wider uppercase text-[#E4E1D8] hover:text-white hover:border-signal-accent transition-colors"
            title="Open Dispatcher Flight Log"
          >
            <span>📋 FLIGHT LOG</span>
            <span className="bg-[#24221D] border border-[#35332C] text-signal-accent px-1.5 py-0.2 text-[8px] font-mono font-bold">
              {displayDemoLog.length}
            </span>
          </button>

          {/* Mode Switch */}
          <div className="flex border border-[#35332C] bg-[#1C1B17] p-0.5">
            <button
              type="button"
              onClick={() => {
                setMode('LIVE');
                if (bufferSize > 0) {
                  setSelectedTimeIndex(bufferSize - 1);
                }
              }}
              className={`px-2.5 py-1 text-[10px] font-display font-bold tracking-wider uppercase transition-colors ${
                mode === 'LIVE'
                  ? 'bg-status-ok text-white font-black shadow-[0_0_6px_rgba(75,123,78,0.5)]'
                  : 'text-[#E4E1D8]/60 hover:text-white'
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
              className={`px-2.5 py-1 text-[10px] font-display font-bold tracking-wider uppercase transition-colors ${
                mode === 'REPLAY'
                  ? 'bg-status-warn text-black font-black shadow-[0_0_6px_rgba(184,134,59,0.5)]'
                  : 'text-[#E4E1D8]/60 hover:text-white'
              }`}
            >
              REPLAY
            </button>
          </div>

          {/* Mission Clock Display */}
          <div className="flex items-center gap-3 bg-[#1C1B17] border border-[#35332C] px-3 py-1.5 rounded-none">
            <span className="font-display text-[9px] font-bold text-[#E4E1D8]/70 tracking-wider">
              {mode === 'LIVE' ? 'MISSION CLOCK' : 'SCRUB CLOCK'}
            </span>
            <span
              className={`font-mono text-sm font-black tracking-widest tabular-nums filter ${
                mode === 'LIVE'
                  ? 'text-status-ok drop-shadow-[0_0_2px_rgba(75,123,78,0.4)]'
                  : 'text-status-warn drop-shadow-[0_0_2px_rgba(184,134,59,0.4)]'
              }`}
            >
              {formatTime(displayClockSeconds)}
            </span>
            <span className="font-mono text-[9px] text-[#E4E1D8]/50">
              / {formatTime(activeConfig?.totalDurationSec || 1200)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex min-h-0 flex-1 bg-[#1C1B17]">
        {/* Left Collapsible Layer Sidebar */}
        <MapLayerToggle
          visibleLayers={visibleLayers}
          onChange={setVisibleLayers}
        />

        {/* Central Tactical Area (Map + Scrubber) */}
        <main className="min-w-0 flex-1 p-3 flex flex-col gap-2">
          <div className={`flex-1 relative min-h-0 bg-[#1C1B17] border transition-colors ${mode === 'REPLAY' ? 'border-status-warn/50' : 'border-[#35332C]'}`}>
            {/* Replay Mode Indicator Badge */}
            {mode === 'REPLAY' && (
              <div className="absolute top-2 left-2 z-10 border border-status-warn bg-[#1C1B17]/95 backdrop-blur-sm px-2.5 py-1 text-[9px] font-display font-black tracking-widest text-status-warn shadow-[0_0_8px_rgba(184,134,59,0.3)] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-status-warn animate-ping" />
                <span>HISTORICAL REPLAY — FRAME {activeIndex + 1}/{bufferSize}</span>
              </div>
            )}
            {mapReady ? (
              <MapViewTopo
                nodes={displayNodes}
                edges={displayEdges}
                convoys={displayConvoys}
                sensors={sensors}
                visibleLayers={visibleLayers}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-[#E4E1D8]/50">
                INITIALIZING TACTICAL GRAPH MAP...
              </div>
            )}
          </div>

          {/* Timeline Scrubber Bar */}
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
          />
        </main>

        {/* Right Info Sidebar Panels */}
        <aside className="flex w-88 shrink-0 flex-col border-l border-[#35332C] bg-[#1C1B17] p-3 overflow-hidden">
          {/* Dispatch Panel (Full Height) */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
            {mapReady ? (
              <DispatchPanelPlacard nodes={displayNodes} convoys={displayConvoys} demoLog={displayDemoLog} />
            ) : (
              <div className="font-mono text-xs text-[#E4E1D8]/50">LOADING DISPATCH DATABASES...</div>
            )}
          </div>
        </aside>
      </div>

      {/* Dispatcher Flight Log Modal Dialog */}
      {isFlightLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="flex h-[80vh] w-full max-w-2xl flex-col border border-[#35332C] bg-[#1C1B17] shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#35332C] bg-[#24221D] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-signal-accent animate-pulse" />
                <h2 className="font-display text-xs font-black tracking-widest text-[#FAF9F6] uppercase">
                  DISPATCHER FLIGHT LOG & INCIDENT FEED
                </h2>
                <span className="font-mono text-[9px] text-[#E4E1D8]/60">
                  ({displayDemoLog.length} EVENTS RECORDED)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFlightLogOpen(false)}
                className="border border-[#35332C] bg-[#1C1B17] px-2.5 py-1 font-mono text-[10px] font-bold text-[#E4E1D8] hover:text-white hover:border-signal-accent transition-colors"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Modal Log Content */}
            <div className="flex-1 min-h-0 p-3 overflow-hidden">
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
    </div>
  );
}
