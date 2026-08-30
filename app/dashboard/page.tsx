'use client';

import { useState } from 'react';
import { useFirestoreCollection } from '../../src/hooks/useFirestoreCollection';
import { useReplayBuffer } from '../../src/hooks/useReplayBuffer';
import type { Node, Edge, Convoy, DemoLogEntry, DemoConfig } from '../../src/lib/types';
import MapViewTopo, { ALL_MAP_LAYERS, type MapLayer } from '../../src/components/MapViewTopo';
import DispatchPanelPlacard from '../../src/components/DispatchPanelPlacard';
import EventFeedDispatcher from '../../src/components/EventFeedDispatcher';
import ReplayTimeline from '../../src/components/ReplayTimeline';
import MapLayerToggle from '../../src/components/MapLayerToggle';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function DashboardPage() {
  const { data: nodes, loading: nodesLoading } = useFirestoreCollection<Node>('nodes');
  const { data: edges, loading: edgesLoading } = useFirestoreCollection<Edge>('edges');
  const { data: convoys, loading: convoysLoading } = useFirestoreCollection<Convoy>('convoys');
  const { data: demoLog, loading: demoLogLoading } = useFirestoreCollection<DemoLogEntry>('demoLog', 'simTimeSec');
  const { data: demoConfigs } = useFirestoreCollection<DemoConfig>('demoConfig');

  const [mode, setMode] = useState<'LIVE' | 'REPLAY'>('LIVE');
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(0);
  const [visibleLayers, setVisibleLayers] = useState<Set<MapLayer>>(ALL_MAP_LAYERS);

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
    <div className="flex h-screen w-screen flex-col bg-brand-bg text-zinc-100 font-sans overflow-hidden">
      {/* Tactical Header Strip */}
      <header className="border-b border-struct-line bg-[#080C10] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-display text-xs font-black tracking-widest text-white uppercase">
              RELAY OPERATION CONTROL
            </h1>
            <p className="text-[9px] font-sans text-zinc-400 tracking-wide uppercase mt-0.5">
              SCENARIO: <span className="text-signal-accent font-semibold">{scenarioName}</span>
            </p>
          </div>
        </div>

        {/* Tactical Counters */}
        <div className="hidden md:flex items-center gap-6 border-l border-r border-struct-line/30 px-6 py-0.5">
          <div className="font-mono text-[10px] leading-tight">
            <span className="text-zinc-500 block">ACTIVE OPERATIONS</span>
            <span className="font-bold text-signal-accent tracking-wider font-mono text-xs">{activeConvoys} CONVOYS</span>
          </div>
          <div className="font-mono text-[10px] leading-tight">
            <span className="text-zinc-500 block">HAZARD INTERRUPTS</span>
            <span className={`font-bold tracking-wider font-mono text-xs ${blockedRoads > 0 ? 'text-status-danger' : 'text-zinc-400'}`}>
              {blockedRoads} BLOCKED SECTIONS
            </span>
          </div>
          <div className="font-mono text-[10px] leading-tight">
            <span className="text-zinc-500 block">ALERT LEVEL SHELTERS</span>
            <span className={`font-bold tracking-wider font-mono text-xs ${criticalShelters > 0 ? 'text-status-danger animate-pulse' : 'text-status-ok'}`}>
              {criticalShelters} CRITICAL
            </span>
          </div>
        </div>

        {/* Mode Toggle & Mission Clock */}
        <div className="flex items-center gap-3">
          {/* Mode Switch */}
          <div className="flex border border-struct-line bg-[#0E151E] p-0.5">
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
                  ? 'bg-status-ok text-black font-black shadow-[0_0_6px_rgba(76,175,109,0.5)]'
                  : 'text-zinc-400 hover:text-white'
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
                  ? 'bg-status-warn text-black font-black shadow-[0_0_6px_rgba(232,163,61,0.5)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              REPLAY
            </button>
          </div>

          {/* Mission Clock Display */}
          <div className="flex items-center gap-3 bg-[#0E151E] border border-struct-line px-3 py-1.5 rounded-none">
            <span className="font-display text-[9px] font-bold text-zinc-400 tracking-wider">
              {mode === 'LIVE' ? 'MISSION CLOCK' : 'SCRUB CLOCK'}
            </span>
            <span
              className={`font-mono text-sm font-black tracking-widest tabular-nums filter ${
                mode === 'LIVE'
                  ? 'text-status-ok drop-shadow-[0_0_2px_rgba(76,175,109,0.4)]'
                  : 'text-status-warn drop-shadow-[0_0_2px_rgba(232,163,61,0.4)]'
              }`}
            >
              {formatTime(displayClockSeconds)}
            </span>
            <span className="font-mono text-[9px] text-zinc-600">
              / {formatTime(activeConfig?.totalDurationSec || 1200)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex min-h-0 flex-1 bg-[#090D12]">
        {/* Left Area (Map + Scrubber) */}
        <main className="min-w-0 flex-1 p-3 flex flex-col gap-2">
          <div className={`flex-1 relative min-h-0 bg-[#070A0E] border transition-colors ${mode === 'REPLAY' ? 'border-status-warn/50' : 'border-struct-line'}`}>
            {/* Replay Mode Indicator Badge */}
            {mode === 'REPLAY' && (
              <div className="absolute top-2 left-2 z-10 border border-status-warn bg-[#080C10]/90 backdrop-blur-sm px-2.5 py-1 text-[9px] font-display font-black tracking-widest text-status-warn shadow-[0_0_8px_rgba(232,163,61,0.3)] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-status-warn animate-ping" />
                <span>HISTORICAL REPLAY — FRAME {activeIndex + 1}/{bufferSize}</span>
              </div>
            )}
            {mapReady ? (
              <MapViewTopo
                nodes={displayNodes}
                edges={displayEdges}
                convoys={displayConvoys}
                visibleLayers={visibleLayers}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-zinc-500">
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
        <aside className="flex w-88 shrink-0 flex-col border-l border-struct-line bg-[#080C10] p-3 gap-3 overflow-hidden">
          {/* Map Layer Controls in Sidebar */}
          <MapLayerToggle
            visibleLayers={visibleLayers}
            onChange={setVisibleLayers}
          />

          {/* Divider */}
          <div className="border-t border-struct-line/30 my-0.5" />

          {/* Dispatch Panel */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {mapReady ? (
              <DispatchPanelPlacard nodes={displayNodes} convoys={displayConvoys} demoLog={displayDemoLog} />
            ) : (
              <div className="font-mono text-xs text-zinc-500">LOADING DISPATCH DATABASES...</div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-struct-line/30 my-0.5" />

          {/* Event Feed */}
          <div className="flex-1 min-h-0">
            <EventFeedDispatcher entries={displayDemoLog} loading={demoLogLoading} />
          </div>
        </aside>
      </div>
    </div>
  );
}
