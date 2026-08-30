'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  type NetworkNode,
  type NetworkScenarioId,
  NETWORK_SCENARIOS,
  initializeNetworkNodes,
  stepNetworkSimulation,
  computeNetworkSummary,
} from '../../src/lib/networkConnectivity';
import NetworkMapView from '../../src/components/network/NetworkMapView';
import NetworkStatsOverview from '../../src/components/network/NetworkStatsOverview';
import NetworkAlertBanner from '../../src/components/network/NetworkAlertBanner';
import NetworkNodeCard from '../../src/components/network/NetworkNodeCard';
import NetworkDataTable from '../../src/components/network/NetworkDataTable';

export default function NetworkDataPage() {
  const [nodes, setNodes] = useState<NetworkNode[]>(() => initializeNetworkNodes());
  const [scenarioId, setScenarioId] = useState<NetworkScenarioId>('monsoon_power_outage');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [simTimeSec, setSimTimeSec] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'map' | 'cards' | 'table'>('map');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  const summary = useMemo(() => computeNetworkSummary(nodes), [nodes]);

  // Stepped Simulation Timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(250, 2000 / simSpeed);
    timerRef.current = setInterval(() => {
      setNodes((prev) => stepNetworkSimulation(prev, scenarioId, 15 * simSpeed));
      setSimTimeSec((t) => t + 15 * simSpeed);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, simSpeed, scenarioId]);

  const handleManualStep = () => {
    setNodes((prev) => stepNetworkSimulation(prev, scenarioId, 60));
    setSimTimeSec((t) => t + 60);
  };

  const handleReset = () => {
    setNodes(initializeNetworkNodes());
    setSimTimeSec(0);
    setSelectedNodeId(null);
  };

  const filteredNodes = useMemo(() => {
    if (filterType === 'all') return nodes;
    return nodes.filter((n) => n.type === filterType);
  }, [nodes, filterType]);

  const formatSimTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `T+${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentScenario = NETWORK_SCENARIOS[scenarioId];

  return (
    <div className="flex min-h-screen w-full flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-600/30">
              📡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Aluva-Periyar Disaster Network & Telecommunications
                </h1>
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Live Connectivity Mesh
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Radio repeaters, microwave backhauls, 5G cellular & tactical satellite telemetry
              </p>
            </div>
          </div>

          {/* Quick links & controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              ← Convoy Dashboard
            </Link>
            <Link
              href="/sensorData"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 shadow-xs hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
            >
              🌊 Water Sensors
            </Link>

            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                  isPlaying
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-emerald-600 text-white shadow-xs'
                }`}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>

              <button
                onClick={handleManualStep}
                title="Step simulation +1 min forward"
                className="flex h-7 items-center rounded-md px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                +1m Step
              </button>

              <select
                value={simSpeed}
                onChange={(e) => setSimSpeed(Number(e.target.value))}
                className="h-7 rounded-md border-0 bg-transparent px-1.5 text-xs font-semibold text-zinc-700 focus:outline-none dark:text-zinc-300"
              >
                <option value={1}>1x Speed</option>
                <option value={5}>5x Speed</option>
                <option value={10}>10x Speed</option>
                <option value={20}>20x Speed</option>
              </select>

              <button
                onClick={handleReset}
                title="Reset simulation"
                className="flex h-7 items-center rounded-md px-2 text-xs font-medium text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Reset
              </button>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1 font-mono text-xs font-bold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {formatSimTime(simTimeSec)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 flex flex-col gap-5">
        {/* Scenario Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Disaster Telecom Scenario:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(NETWORK_SCENARIOS) as NetworkScenarioId[]).map((key) => {
                const sc = NETWORK_SCENARIOS[key];
                const active = scenarioId === key;
                return (
                  <button
                    key={key}
                    onClick={() => setScenarioId(key)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      active
                        ? 'bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-black font-semibold'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {sc.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-zinc-500 dark:text-zinc-400 italic">
            {currentScenario.description}
          </div>
        </div>

        {/* Emergency Alert Banner */}
        <NetworkAlertBanner
          nodes={nodes}
          onSelectNode={(node) => {
            setSelectedNodeId(node.id);
            setActiveTab('map');
          }}
        />

        {/* Summary Overview KPIs */}
        <NetworkStatsOverview summary={summary} />

        {/* View Tabs & Type Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('map')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'map'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              🗺️ Tactical Mesh Map
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'cards'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              📊 Telemetry Cards ({filteredNodes.length})
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'table'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              📋 Network Data Table & CSV
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Filter Location Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-8 rounded-lg border border-zinc-300 bg-white px-2.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="all">All 30 Stations</option>
              <option value="depot">Depots (2)</option>
              <option value="shelter">Shelters & Clinics (4)</option>
              <option value="village">Villages & Settlements (12)</option>
              <option value="junction">Highway Junctions (12)</option>
            </select>
          </div>
        </div>

        {/* Tab 1: Tactical Mesh Map & Inspector */}
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="h-[640px] lg:col-span-8">
              <NetworkMapView
                nodes={filteredNodes}
                selectedNodeId={selectedNodeId}
                onSelectNode={(n) => setSelectedNodeId(n ? n.id : null)}
              />
            </div>

            <div className="flex flex-col gap-4 lg:col-span-4">
              {selectedNode ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Station Telecommunications
                    </span>
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <NetworkNodeCard node={selectedNode} isSelected />

                  {/* Mesh Topology Peering List */}
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
                    <h5 className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Tactical Mesh RF Peers ({selectedNode.meshPeers.length})
                    </h5>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                      Direct line-of-sight microwave and VHF radio mesh peers:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedNode.meshPeers.map((peerId, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedNodeId(peerId)}
                          className="rounded bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800"
                        >
                          {peerId}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800 text-[11px] text-zinc-400">
                      {selectedNode.notes}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400 dark:border-zinc-800">
                  <span className="text-3xl">📡</span>
                  <p className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Click on any telecommunications node on the map to inspect roundtrip ping latency, packet loss %, active uplink channels, and backup power reserves.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Grid of Node Cards */}
        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredNodes.map((node) => (
              <NetworkNodeCard
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId}
                onSelect={(n) => {
                  setSelectedNodeId(n.id);
                  setActiveTab('map');
                }}
              />
            ))}
          </div>
        )}

        {/* Tab 3: Detailed Data Table */}
        {activeTab === 'table' && (
          <NetworkDataTable
            nodes={filteredNodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={(n) => {
              setSelectedNodeId(n.id);
              setActiveTab('map');
            }}
          />
        )}
      </main>
    </div>
  );
}
