'use client';

import { useState, useMemo } from 'react';
import type { WaterSensor, WaterLevelStatus, BasinSection } from '../lib/waterSensors';

interface SensorDataTableProps {
  sensors: WaterSensor[];
  selectedSensorId: string | null;
  onSelectSensor: (sensor: WaterSensor) => void;
}

const STATUS_PILL: Record<WaterLevelStatus, { label: string; className: string }> = {
  normal: { label: 'Normal', className: 'bg-[#203024] text-status-ok border-[#4B7B4E]/60' },
  advisory: { label: 'Advisory', className: 'bg-[#2C2A1E] text-status-warn border-[#B8863B]/60' },
  warning: { label: 'Warning', className: 'bg-[#352718] text-status-warn border-[#B8863B]/60' },
  critical: { label: 'Critical', className: 'bg-[#351C1A] text-status-danger border-[#A6403A]/60' },
};

export default function SensorDataTable({
  sensors,
  selectedSensorId,
  onSelectSensor,
}: SensorDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [basinFilter, setBasinFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'level' | 'rise' | 'code' | 'flow'>('level');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredSensors = useMemo(() => {
    return sensors
      .filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.basinSection.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.correlatedNodeNames.some((n) => n.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        const matchesBasin = basinFilter === 'all' || s.basinSection === basinFilter;

        return matchesSearch && matchesStatus && matchesBasin;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'level') diff = a.currentLevelM - b.currentLevelM;
        else if (sortField === 'rise') diff = a.rateOfRiseMPerHour - b.rateOfRiseMPerHour;
        else if (sortField === 'flow') diff = a.flowVelocityMps - b.flowVelocityMps;
        else if (sortField === 'code') diff = a.code.localeCompare(b.code);
        return sortAsc ? diff : -diff;
      });
  }, [sensors, searchTerm, statusFilter, basinFilter, sortField, sortAsc]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Code',
      'Name',
      'Basin Section',
      'Status',
      'Current Level (m)',
      'Baseline (m)',
      'Warning Threshold (m)',
      'Critical Threshold (m)',
      'Rate of Rise (m/h)',
      'Flow Velocity (m/s)',
      'Discharge (cumecs)',
      'Road Submersion (m)',
      'Battery (%)',
      'Signal (dBm)',
      'Latitude',
      'Longitude',
    ];

    const rows = filteredSensors.map((s) => [
      s.code,
      `"${s.name}"`,
      `"${s.basinSection}"`,
      s.status,
      s.currentLevelM,
      s.baselineLevelM,
      s.warningLevelM,
      s.criticalLevelM,
      s.rateOfRiseMPerHour,
      s.flowVelocityMps,
      s.dischargeRateCumecs,
      s.roadSubmersionDepthM,
      s.batteryPct,
      s.signalDbm,
      s.lat,
      s.lng,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `water_sensors_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const basinList: BasinSection[] = [
    'Upper Periyar Catchment',
    'North Riverbank Basin',
    'Grand Canal Drainage',
    'Western Coastal & Culverts',
    'Central Floodplain',
    'Southern Delta & Estuary',
  ];

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      {/* Table Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search station, code, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-64 rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value="all">All Alert Levels</option>
            <option value="critical">Critical Flood Only</option>
            <option value="warning">Warning Only</option>
            <option value="advisory">Advisory Only</option>
            <option value="normal">Normal Only</option>
          </select>

          {/* Basin Filter */}
          <select
            value={basinFilter}
            onChange={(e) => setBasinFilter(e.target.value)}
            className="h-9 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value="all">All River Basin Zones</option>
            {basinList.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            Showing <strong className="text-zinc-800 dark:text-zinc-200">{filteredSensors.length}</strong> of {sensors.length}
          </span>
          <button
            onClick={handleExportCsv}
            className="h-9 rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400">
            <tr>
              <th
                onClick={() => {
                  setSortField('code');
                  setSortAsc(!sortAsc);
                }}
                className="cursor-pointer px-4 py-3 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Station & ID {sortField === 'code' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th className="px-4 py-3">Basin Catchment</th>
              <th className="px-4 py-3">Status</th>
              <th
                onClick={() => {
                  setSortField('level');
                  setSortAsc(!sortAsc);
                }}
                className="cursor-pointer px-4 py-3 text-right hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Water Level {sortField === 'level' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th
                onClick={() => {
                  setSortField('rise');
                  setSortAsc(!sortAsc);
                }}
                className="cursor-pointer px-4 py-3 text-right hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Rate of Rise {sortField === 'rise' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th
                onClick={() => {
                  setSortField('flow');
                  setSortAsc(!sortAsc);
                }}
                className="cursor-pointer px-4 py-3 text-right hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Flow Velocity {sortField === 'flow' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th className="px-4 py-3 text-right">Discharge</th>
              <th className="px-4 py-3 text-right">Road Submersion</th>
              <th className="px-4 py-3 text-right">Telemetry Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredSensors.map((sensor) => {
              const isSelected = sensor.id === selectedSensorId;
              const pill = STATUS_PILL[sensor.status];

              return (
                <tr
                  key={sensor.id}
                  onClick={() => onSelectSensor(sensor)}
                  className={`cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                    isSelected ? 'bg-sky-50 dark:bg-sky-950/30' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                        {sensor.code}
                      </span>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{sensor.name}</div>
                        <div className="text-[10px] text-zinc-400">
                          {sensor.lat.toFixed(3)}°N, {sensor.lng.toFixed(3)}°E
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{sensor.basinSection}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pill.className}`}
                    >
                      {pill.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {sensor.currentLevelM.toFixed(2)}m
                    <span className="block text-[10px] font-normal text-zinc-400">
                      Warn: {sensor.warningLevelM}m
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span
                      className={`font-semibold ${
                        sensor.rateOfRiseMPerHour > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
                      }`}
                    >
                      {sensor.rateOfRiseMPerHour > 0 ? `+${sensor.rateOfRiseMPerHour}` : sensor.rateOfRiseMPerHour} m/h
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                    {sensor.flowVelocityMps} m/s
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-600 dark:text-zinc-400">
                    {sensor.dischargeRateCumecs} m³/s
                  </td>
                  <td className="px-4 py-3 text-right">
                    {sensor.roadSubmersionDepthM > 0 ? (
                      <span className="font-mono font-bold text-red-600 dark:text-red-400">
                        +{sensor.roadSubmersionDepthM}m
                      </span>
                    ) : (
                      <span className="text-zinc-400">Dry</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] text-zinc-500">
                    <span>🔋 {sensor.batteryPct}%</span> • <span>📶 {sensor.signalDbm}dBm</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
