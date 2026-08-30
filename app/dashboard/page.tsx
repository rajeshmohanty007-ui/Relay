'use client';

import { useFirestoreCollection } from '../../src/hooks/useFirestoreCollection';
import type { Node, Edge, Convoy, DemoLogEntry, DemoConfig } from '../../src/lib/types';
import MapViewTopo from '../../src/components/MapViewTopo';
import DispatchPanelPlacard from '../../src/components/DispatchPanelPlacard';
import EventFeedDispatcher from '../../src/components/EventFeedDispatcher';

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

  const mapReady = !nodesLoading && !edgesLoading && !convoysLoading;
  const activeConfig = demoConfigs?.[0];
  const scenarioName = activeConfig?.scenarioName || "Aluva-Periyar River Flood Relief Basin (Monsoon Crisis)";

  // Compute elapsed simulation time
  const elapsedSeconds = demoLog.length > 0 
    ? Math.max(...demoLog.map(l => l.simTimeSec))
    : 0;

  // Calculate stats for the tactical header
  const activeConvoys = convoys.filter(c => c.status === 'enroute' || c.status === 'rerouted').length;
  const blockedRoads = edges.filter(e => e.status === 'blocked').length;
  const criticalShelters = nodes.filter(n => n.type === 'shelter' && n.criticalSupplyNeed && n.criticalSupplyNeed.hoursOfStockRemaining <= 3.0).length;

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

        {/* Mission Clock */}
        <div className="flex items-center gap-3 bg-[#0E151E] border border-struct-line px-3 py-1.5 rounded-none">
          <span className="font-display text-[9px] font-bold text-zinc-400 tracking-wider">
            MISSION CLOCK
          </span>
          <span className="font-mono text-sm font-black text-status-ok tracking-widest tabular-nums filter drop-shadow-[0_0_2px_rgba(76,175,109,0.4)]">
            {formatTime(elapsedSeconds)}
          </span>
          <span className="font-mono text-[9px] text-zinc-600">
            / {formatTime(activeConfig?.totalDurationSec || 1200)}
          </span>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex min-h-0 flex-1 bg-[#090D12]">
        {/* Left Map View */}
        <main className="min-w-0 flex-1 p-3 flex flex-col gap-2">
          <div className="flex-1 relative min-h-0 bg-[#070A0E] border border-struct-line">
            {mapReady ? (
              <MapViewTopo nodes={nodes} edges={edges} convoys={convoys} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-zinc-500">
                INITIALIZING TACTICAL GRAPH MAP...
              </div>
            )}
          </div>
        </main>

        {/* Right Info Sidebar Panels */}
        <aside className="flex w-88 shrink-0 flex-col border-l border-struct-line bg-[#080C10] p-3 gap-3 overflow-hidden">
          {/* Dispatch Panel */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {mapReady ? (
              <DispatchPanelPlacard nodes={nodes} convoys={convoys} demoLog={demoLog} />
            ) : (
              <div className="font-mono text-xs text-zinc-500">LOADING DISPATCH DATABASES...</div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-struct-line/30 my-0.5" />

          {/* Event Feed */}
          <div className="flex-1 min-h-0">
            <EventFeedDispatcher entries={demoLog} loading={demoLogLoading} />
          </div>
        </aside>
      </div>
    </div>
  );
}
