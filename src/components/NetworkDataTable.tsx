'use client';

import { useState, useMemo } from 'react';
import type { NetworkNode, NetworkStatus } from '../lib/networkConnectivity';

interface NetworkDataTableProps {
  nodes: NetworkNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: NetworkNode) => void;
}

const STATUS_PILL: Record<NetworkStatus, { label: string; className: string }> = {
  optimal: { label: 'Optimal', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  degraded: { label: 'Degraded', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  critical_drop: { label: 'Packet Loss', className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800' },
  blackout: { label: 'Blackout', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' },
};

export default function NetworkDataTable({
  nodes,
  selectedNodeId,
  onSelectNode,
}: NetworkDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'latency' | 'loss' | 'bandwidth' | 'code'>('latency');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredNodes = useMemo(() => {
    return nodes
      .filter((n) => {
        const matchesSearch =
          n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.activeChannel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.type.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
        const matchesType = typeFilter === 'all' || n.type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'latency') diff = a.latencyMs - b.latencyMs;
        else if (sortField === 'loss') diff = a.packetLossPct - b.packetLossPct;
        else if (sortField === 'bandwidth') diff = a.bandwidthMbps - b.bandwidthMbps;
        else if (sortField === 'code') diff = a.code.localeCompare(b.code);
        return sortAsc ? diff : -diff;
      });
  }, [nodes, searchTerm, statusFilter, typeFilter, sortField, sortAsc]);

  
  const handleExportCsv = () => {
    const headers = [
      'Station Code',
      'Name',
      'Type',
      'Status',
      'Active Channel',
      'Latency (ms)',
      'Packet Loss (%)',
      'Bandwidth (Mbps)',
      'Signal (dBm)',
      'Power Source',
      'Battery Remaining (h)',
      'Connected Transceivers',
      'Latitude',
      'Longitude',
    ];

    const rows = filteredNodes.map((n) => [
      n.code,
      `"${n.name}"`,
      n.type,
      n.status,
      `"${n.activeChannel}"`,
      n.latencyMs,
      n.packetLossPct,
      n.bandwidthMbps,
      n.signalDbm,
      `"${n.powerSource}"`,
      n.batteryHoursRemaining,
      n.connectedDevices,
      n.lat,
      n.lng,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `network_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      {}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search station, channel, code..."
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

          {}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value="all">All Network Statuses</option>
            <option value="blackout">Blackouts Only</option>
            <option value="critical_drop">Packet Loss Only</option>
            <option value="degraded">Degraded Only</option>
            <option value="optimal">Optimal Only</option>
          </select>

          {}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value="all">All Node Types</option>
            <option value="depot">Depots (Logistics Hubs)</option>
            <option value="shelter">Shelters & Clinics</option>
            <option value="village">Villages & Settlements</option>
            <option value="junction">Highway Junctions</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            Showing <strong className="text-zinc-800 dark:text-zinc-200">{filteredNodes.length}</strong> of {nodes.length}
          </span>
          <button
            onClick={handleExportCsv}
            className="h-9 rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {}
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
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Active Channel</th>
              <th
                onClick={() => {
                  setSortField('latency');
                  setSortAsc(!sortAsc);
                }}
                className="cursor-pointer px-4 py-3 text-right hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Latency {sortField === 'latency' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th
                onClick={() => {
                  setSortField('loss');
                  setSortAsc(!sortAsc);
                }}
                className="cursor-pointer px-4 py-3 text-right hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Packet Loss {sortField === 'loss' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th
                onClick={() => {
                  setSortField('bandwidth');
                  setSortAsc(!sortAsc);
                }}
                className="cursor-pointer px-4 py-3 text-right hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Throughput {sortField === 'bandwidth' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th className="px-4 py-3 text-right">Power & Battery</th>
              <th className="px-4 py-3 text-right">Devices</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredNodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const pill = STATUS_PILL[node.status];

              return (
                <tr
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  className={`cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                    isSelected ? 'bg-sky-50 dark:bg-sky-950/30' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                        {node.code}
                      </span>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{node.name}</div>
                        <div className="text-[10px] text-zinc-400">
                          {node.lat.toFixed(3)}°N, {node.lng.toFixed(3)}°E
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 capitalize">{node.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pill.className}`}
                    >
                      {pill.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 font-medium">
                    {node.activeChannel}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {node.latencyMs} ms
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span
                      className={`font-semibold ${
                        node.packetLossPct > 10 ? 'text-red-600 dark:text-red-400' : node.packetLossPct > 2 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {node.packetLossPct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                    {node.bandwidthMbps} Mbps
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] text-zinc-500">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{node.batteryHoursRemaining}h</span> ({node.powerSource})
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                    {node.connectedDevices}
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
