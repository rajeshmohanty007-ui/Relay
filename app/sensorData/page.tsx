'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  type WaterSensor,
  type WeatherScenarioId,
  WEATHER_SCENARIOS,
  initializeSensors,
  stepSensorSimulation,
  computeSensorSummary,
} from '../../src/lib/waterSensors';
import SensorMapView from '../../src/components/SensorMapView';
import SensorStatsOverview from '../../src/components/SensorStatsOverview';
import SensorAlertBanner from '../../src/components/SensorAlertBanner';
import SensorTelemetryCard from '../../src/components/SensorTelemetryCard';
import SensorDataTable from '../../src/components/SensorDataTable';

export default function SensorDataPage() {
  const [sensors, setSensors] = useState<WaterSensor[]>(() => initializeSensors());
  const [scenarioId, setScenarioId] = useState<WeatherScenarioId>('heavy_monsoon');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [simTimeSec, setSimTimeSec] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'map' | 'cards' | 'table'>('map');
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [filterBasin, setFilterBasin] = useState<string>('all');

  const selectedSensor = useMemo(() => {
    return sensors.find((s) => s.id === selectedSensorId) ?? null;
  }, [sensors, selectedSensorId]);

  const summary = useMemo(() => computeSensorSummary(sensors), [sensors]);

  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(250, 2000 / simSpeed);
    timerRef.current = setInterval(() => {
      setSensors((prev) => stepSensorSimulation(prev, scenarioId, 15 * simSpeed));
      setSimTimeSec((t) => t + 15 * simSpeed);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, simSpeed, scenarioId]);

  const handleManualStep = () => {
    setSensors((prev) => stepSensorSimulation(prev, scenarioId, 60));
    setSimTimeSec((t) => t + 60);
  };

  const handleReset = () => {
    setSensors(initializeSensors());
    setSimTimeSec(0);
    setSelectedSensorId(null);
  };

  const filteredSensors = useMemo(() => {
    if (filterBasin === 'all') return sensors;
    return sensors.filter((s) => s.basinSection === filterBasin);
  }, [sensors, filterBasin]);

  const formatSimTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `T+${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentScenario = WEATHER_SCENARIOS[scenarioId];

  return (
    <div className="flex min-h-screen w-full flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      {}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 font-bold text-white shadow-md shadow-sky-600/30">
              <svg className="w-6 h-6 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.5c-4.142 0-7.5-3.358-7.5-7.5C4.5 9.385 12 2.5 12 2.5S19.5 9.385 19.5 14c0 4.142-3.358 7.5-7.5 7.5z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Aluva-Periyar River Basin Water Sensor Network
                </h1>
                <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  Live Telemetry Simulation
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Real-time river stage, flood crest, culvert inundation & flow telemetry
              </p>
            </div>
          </div>

          {}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              ← Return to Convoy Dashboard
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

      {}
      <main className="flex-1 p-4 sm:p-6 flex flex-col gap-5">
        {}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Weather Scenario:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(WEATHER_SCENARIOS) as WeatherScenarioId[]).map((key) => {
                const sc = WEATHER_SCENARIOS[key];
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

        {}
        <SensorAlertBanner
          sensors={sensors}
          onSelectSensor={(sensor) => {
            setSelectedSensorId(sensor.id);
            setActiveTab('map');
          }}
        />

        {}
        <SensorStatsOverview summary={summary} />

        {}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('map')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'map'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              🗺️ Interactive Hydro Map
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'cards'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              📊 Telemetry Cards ({filteredSensors.length})
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'table'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h6m-6 4h6" />
              </svg>
              <span>Data Table & CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Filter Catchment:</label>
            <select
              value={filterBasin}
              onChange={(e) => setFilterBasin(e.target.value)}
              className="h-8 rounded-lg border border-zinc-300 bg-white px-2.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="all">All Basins ({sensors.length})</option>
              <option value="Upper Periyar Catchment">Upper Periyar</option>
              <option value="North Riverbank Basin">North Riverbank</option>
              <option value="Grand Canal Drainage">Grand Canal</option>
              <option value="Western Coastal & Culverts">Western Coastal</option>
              <option value="Central Floodplain">Central Floodplain</option>
              <option value="Southern Delta & Estuary">Southern Delta</option>
            </select>
          </div>
        </div>

        {}
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="h-[640px] lg:col-span-8">
              <SensorMapView
                sensors={filteredSensors}
                selectedSensorId={selectedSensorId}
                onSelectSensor={(s) => setSelectedSensorId(s ? s.id : null)}
              />
            </div>

            <div className="flex flex-col gap-4 lg:col-span-4">
              {selectedSensor ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Active Sensor Telemetry
                    </span>
                    <button
                      onClick={() => setSelectedSensorId(null)}
                      className="text-xs text-sky-600 hover:underline dark:text-sky-400"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <SensorTelemetryCard sensor={selectedSensor} isSelected />

                  {}
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
                    <h5 className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Disaster Convoy Route Correlation
                    </h5>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                      This sensor directly monitors hydrological safety for these road nodes:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedSensor.correlatedNodeNames.map((node, i) => (
                        <span
                          key={i}
                          className="rounded bg-sky-50 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                        >
                          {node}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800 text-[11px] text-zinc-400">
                      Edge Identifiers: {selectedSensor.correlatedEdgeIds.join(', ')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400 dark:border-zinc-800">
                  <span className="text-3xl">📍</span>
                  <p className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Click on any water sensor node on the map to inspect live stage levels, discharge rates, sparkline history, and connected convoy routes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {}
        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSensors.map((sensor) => (
              <SensorTelemetryCard
                key={sensor.id}
                sensor={sensor}
                isSelected={sensor.id === selectedSensorId}
                onSelect={(s) => {
                  setSelectedSensorId(s.id);
                  setActiveTab('map');
                }}
              />
            ))}
          </div>
        )}

        {}
        {activeTab === 'table' && (
          <SensorDataTable
            sensors={filteredSensors}
            selectedSensorId={selectedSensorId}
            onSelectSensor={(s) => {
              setSelectedSensorId(s.id);
              setActiveTab('map');
            }}
          />
        )}
      </main>
    </div>
  );
}
