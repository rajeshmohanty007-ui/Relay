'use client';

import React, { useState, useMemo } from 'react';
import type { Edge, Node } from '../lib/types';

export interface GrievanceReport {
  id: string;
  roadEdgeId: string;
  roadName: string;
  fromNodeName: string;
  toNodeName: string;
  reporterName: string;
  vehicleNumber: string;
  contactNumber: string;
  blockageType: 'mudslide' | 'flood_inundation' | 'debris_tree' | 'bridge_damage' | 'road_collapse';
  description: string;
  photoUrl: string | null;
  reportedAtIso: string;
  rescueStatus: 'pending' | 'dispatched' | 'resolved';
  dispatchedTeamName?: string;
  etaMin?: number;
}

export interface GrievanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  edges: Edge[];
  nodes: Node[];
}

const INITIAL_REPORTS: GrievanceReport[] = [
  {
    id: 'grv_001',
    roadEdgeId: 'edge_jdam_vtea',
    roadName: 'Dam-Tea Foothills Overpass Access',
    fromNodeName: 'Dam Access Road Junction',
    toNodeName: 'Tea Foothills Village',
    reporterName: 'Sunil Nair',
    vehicleNumber: 'KL-07-BN-8821',
    contactNumber: '+91 98470 12345',
    blockageType: 'mudslide',
    description: 'Heavy hill mudslide covering both lanes. 3 ambulances and 4 civilian cars stranded.',
    photoUrl: null,
    reportedAtIso: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    rescueStatus: 'pending',
  },
  {
    id: 'grv_002',
    roadEdgeId: 'edge_jdam_vtea',
    roadName: 'Dam-Tea Foothills Overpass Access',
    fromNodeName: 'Dam Access Road Junction',
    toNodeName: 'Tea Foothills Village',
    reporterName: 'Deepa Varghese',
    vehicleNumber: 'KL-42-E-3910',
    contactNumber: '+91 94471 98765',
    blockageType: 'mudslide',
    description: 'Tree fell on power lines across the road right after the hairpin bend.',
    photoUrl: null,
    reportedAtIso: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    rescueStatus: 'pending',
  },
  {
    id: 'grv_003',
    roadEdgeId: 'edge_vcauseway_swest',
    roadName: 'West Causeway Connector',
    fromNodeName: 'Causeway Haven Village',
    toNodeName: 'West Creek Civic Hall Shelter',
    reporterName: 'Mohammed Rashid',
    vehicleNumber: 'KL-08-AU-5104',
    contactNumber: '+91 97452 44321',
    blockageType: 'flood_inundation',
    description: 'Tidal sluice overflow. Water level above bonnet height. Cannot proceed towards shelter.',
    photoUrl: null,
    reportedAtIso: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    rescueStatus: 'dispatched',
    dispatchedTeamName: 'NDRF Rapid Flood Rescue Unit-04',
    etaMin: 7,
  },
];

const BLOCKAGE_TYPES = [
  { id: 'mudslide', label: 'Mudslide / Landslide', icon: '⛰️' },
  { id: 'flood_inundation', label: 'Flash Flood / Deep Inundation', icon: '🌊' },
  { id: 'debris_tree', label: 'Fallen Tree / Power Cables Debris', icon: '🌲' },
  { id: 'bridge_damage', label: 'Bridge Structural Damage / Closure', icon: '🌉' },
  { id: 'road_collapse', label: 'Road Embankment Collapse', icon: '🚧' },
] as const;

export default function GrievanceFormModal({
  isOpen,
  onClose,
  edges,
  nodes,
}: GrievanceFormModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'reports'>('form');
  const [reports, setReports] = useState<GrievanceReport[]>(INITIAL_REPORTS);
  const [latestNotification, setLatestNotification] = useState<{
    vehicleNumber: string;
    teamName: string;
    etaMin: number;
    roadName: string;
  } | null>(null);

  // Form input states
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>(edges[0]?.id || 'edge_jdam_vtea');
  const [reporterName, setReporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [blockageType, setBlockageType] = useState<GrievanceReport['blockageType']>('mudslide');
  const [description, setDescription] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n.name])), [nodes]);

  // Group reports by road edge to calculate unique vehicle counts & priority
  const roadIncidentStats = useMemo(() => {
    const grouped = new Map<string, { count: number; uniqueVehicles: Set<string>; reports: GrievanceReport[] }>();
    for (const report of reports) {
      if (!grouped.has(report.roadEdgeId)) {
        grouped.set(report.roadEdgeId, { count: 0, uniqueVehicles: new Set(), reports: [] });
      }
      const entry = grouped.get(report.roadEdgeId)!;
      entry.count++;
      entry.uniqueVehicles.add(report.vehicleNumber.trim().toUpperCase());
      entry.reports.push(report);
    }
    return grouped;
  }, [reports]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterName.trim() || !vehicleNumber.trim() || !contactNumber.trim()) {
      alert('Please fill in your name, unique vehicle registration number, and emergency contact number.');
      return;
    }

    setIsSubmitting(true);

    const edge = edges.find((ed) => ed.id === selectedEdgeId);
    const fromName = edge ? (nodesById.get(edge.fromNodeId) || edge.fromNodeId) : 'Unknown Origin';
    const toName = edge ? (nodesById.get(edge.toNodeId) || edge.toNodeId) : 'Unknown Destination';
    const roadName = edge ? `${fromName} ↔ ${toName}` : 'Designated Evacuation Corridor';

    const newReport: GrievanceReport = {
      id: `grv_${Date.now().toString().slice(-4)}`,
      roadEdgeId: selectedEdgeId,
      roadName,
      fromNodeName: fromName,
      toNodeName: toName,
      reporterName: reporterName.trim(),
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      contactNumber: contactNumber.trim(),
      blockageType,
      description: description.trim() || 'Blocked road section preventing evacuation passage.',
      photoUrl: photoPreview,
      reportedAtIso: new Date().toISOString(),
      rescueStatus: 'pending',
    };

    setTimeout(() => {
      setReports((prev) => [newReport, ...prev]);
      setIsSubmitting(false);
      setSubmitSuccess(true);
      // Reset fields
      setReporterName('');
      setVehicleNumber('');
      setContactNumber('');
      setDescription('');
      setPhotoPreview('');
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('reports');
      }, 1500);
    }, 600);
  };

  // Dispatch rescue team to a road segment
  const handleDispatchRescue = (edgeId: string, roadName: string) => {
    const teams = [
      'NDRF Disaster Response Unit Alpha',
      'Kerala State Emergency Rescue Squad-02',
      'Army Engineering Quick Clearance Team',
      'Civil Defense Amphibious Rescue Crew',
    ];
    const chosenTeam = teams[Math.floor(Math.random() * teams.length)];
    const eta = Math.floor(Math.random() * 8) + 6; // 6 to 14 mins

    setReports((prev) =>
      prev.map((r) =>
        r.roadEdgeId === edgeId
          ? {
              ...r,
              rescueStatus: 'dispatched',
              dispatchedTeamName: chosenTeam,
              etaMin: eta,
            }
          : r,
      ),
    );

    // Pick a vehicle to notify
    const targetReport = reports.find((r) => r.roadEdgeId === edgeId);
    if (targetReport) {
      setLatestNotification({
        vehicleNumber: targetReport.vehicleNumber,
        teamName: chosenTeam,
        etaMin: eta,
        roadName,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-[#35332C] bg-[#1C1B17] shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#35332C] bg-[#24221D] px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#A6403A] bg-[#A6403A]/15 text-[#A6403A] shadow-sm">
              <span className="text-base">🚨</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-black tracking-widest text-[#FAF9F6] uppercase">
                CITIZEN ROAD GRIEVANCE & EMERGENCY RESCUE DISPATCH
              </h2>
              <p className="text-[9px] font-sans text-[#E4E1D8]/70">
                Report impassable single-access roads, stranded vehicles & request priority rescue team dispatch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#35332C] bg-[#1C1B17] px-3.5 py-1.5 font-mono text-xs font-bold text-[#E4E1D8] hover:text-white hover:border-signal-accent hover:bg-[#24221D] transition-all"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Live Rescue Notification Banner (if any team dispatched) */}
        {latestNotification && (
          <div className="bg-[#A6403A]/20 border-b border-[#A6403A] px-6 py-2.5 flex items-center justify-between animate-in slide-in-from-top-2 duration-200 shrink-0">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#A6403A] animate-ping" />
              <div className="font-mono text-xs text-[#FAF9F6]">
                <span className="font-bold text-[#A6403A] uppercase tracking-wider">
                  🚨 RESCUE UNIT EN ROUTE:
                </span>{' '}
                <span className="text-white font-bold">{latestNotification.teamName}</span> dispatched to stranded vehicle{' '}
                <span className="bg-black/60 px-2 py-0.5 rounded-md border border-[#A6403A]/50 text-signal-accent font-bold">
                  {latestNotification.vehicleNumber}
                </span>{' '}
                at {latestNotification.roadName} (ETA ~{latestNotification.etaMin} mins).
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLatestNotification(null)}
              className="font-mono text-[9px] text-[#E4E1D8]/70 hover:text-white border border-[#35332C] px-2 py-0.5 rounded-lg"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[#35332C] bg-[#24221D] px-6 pt-2.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 rounded-t-xl border-t border-l border-r px-4 py-2 text-xs font-display font-black tracking-wider uppercase transition-all ${
              activeTab === 'form'
                ? 'border-signal-accent bg-[#1C1B17] text-signal-accent'
                : 'border-transparent bg-transparent text-[#E4E1D8]/60 hover:text-[#FAF9F6]'
            }`}
          >
            <span>📝 SUBMIT GRIEVANCE</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 rounded-t-xl border-t border-l border-r px-4 py-2 text-xs font-display font-black tracking-wider uppercase transition-all ${
              activeTab === 'reports'
                ? 'border-signal-accent bg-[#1C1B17] text-signal-accent'
                : 'border-transparent bg-transparent text-[#E4E1D8]/60 hover:text-[#FAF9F6]'
            }`}
          >
            <span>🚨 ACTIVE INCIDENT QUEUE</span>
            <span className="bg-signal-accent/20 border border-signal-accent/50 text-signal-accent px-2 py-0.5 rounded-full text-[9px] font-mono font-bold">
              {reports.length}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-[#1C1B17]">
          {/* TAB 1: SUBMISSION FORM */}
          {activeTab === 'form' && (
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex flex-col gap-4">
              {submitSuccess && (
                <div className="border border-status-ok bg-status-ok/10 p-3.5 rounded-2xl text-status-ok font-mono text-xs flex items-center gap-2.5 animate-in fade-in shadow-sm">
                  <span>✓</span>
                  <span>
                    Report received successfully! Dispatched to disaster management control. Priority escalated based on vehicle registration.
                  </span>
                </div>
              )}

              {/* Road / Location Selection */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="road-selection" className="font-display text-[10px] font-bold uppercase tracking-wider text-signal-accent">
                  1. SELECT BLOCKED ROAD CORRIDOR (POINT A ↔ POINT B) *
                </label>
                <select
                  id="road-selection"
                  value={selectedEdgeId}
                  onChange={(e) => setSelectedEdgeId(e.target.value)}
                  className="border border-[#35332C] bg-[#24221D] px-3.5 py-2.5 rounded-xl text-xs font-mono text-[#FAF9F6] outline-none focus:border-signal-accent transition-all"
                >
                  {edges.map((edge) => {
                    const from = nodesById.get(edge.fromNodeId) || edge.fromNodeId;
                    const to = nodesById.get(edge.toNodeId) || edge.toNodeId;
                    const isBlocked = edge.status === 'blocked';
                    return (
                      <option key={edge.id} value={edge.id}>
                        {from} ↔ {to} ({edge.id}) {isBlocked ? '[CURRENTLY BLOCKED]' : '[CLEAR]'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Hazard / Blockage Type */}
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-[10px] font-bold uppercase tracking-wider text-signal-accent">
                  2. BLOCKAGE / HAZARD SEVERITY *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BLOCKAGE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setBlockageType(type.id)}
                      className={`flex items-center gap-2.5 border p-2.5 rounded-xl text-left text-xs font-mono transition-all ${
                        blockageType === type.id
                          ? 'border-[#A6403A] bg-[#A6403A]/20 text-[#FAF9F6] font-bold shadow-[0_0_10px_rgba(166,64,58,0.25)]'
                          : 'border-[#35332C] bg-[#24221D] text-[#E4E1D8]/70 hover:text-white hover:bg-[#2C2A24]'
                      }`}
                    >
                      <span className="text-base shrink-0">{type.icon}</span>
                      <span className="text-[11px] leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Unique Identity Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-[#35332C] bg-[#24221D] p-3.5 rounded-2xl shadow-sm">
                <div className="flex flex-col gap-1">
                  <label htmlFor="vehicle-reg" className="font-display text-[9px] font-bold uppercase tracking-wider text-[#FAF9F6]">
                    VEHICLE REG (UNIQUE ID) *
                  </label>
                  <input
                    id="vehicle-reg"
                    type="text"
                    required
                    placeholder="e.g. KL-07-CD-4921"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="border border-[#35332C] bg-[#1C1B17] px-3 py-1.5 rounded-xl text-xs font-mono text-signal-accent uppercase font-bold outline-none focus:border-signal-accent transition-all"
                  />
                  <span className="text-[8px] font-mono text-[#E4E1D8]/60">Auto-escalates priority on multiple reports</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="reporter-name" className="font-display text-[9px] font-bold uppercase tracking-wider text-[#FAF9F6]">
                    REPORTER FULL NAME *
                  </label>
                  <input
                    id="reporter-name"
                    type="text"
                    required
                    placeholder="e.g. Rajesh Mohanty"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="border border-[#35332C] bg-[#1C1B17] px-3 py-1.5 rounded-xl text-xs font-mono text-white outline-none focus:border-signal-accent transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="contact-num" className="font-display text-[9px] font-bold uppercase tracking-wider text-[#FAF9F6]">
                    CONTACT PHONE *
                  </label>
                  <input
                    id="contact-num"
                    type="tel"
                    required
                    placeholder="+91 98470 XXXXX"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="border border-[#35332C] bg-[#1C1B17] px-3 py-1.5 rounded-xl text-xs font-mono text-white outline-none focus:border-signal-accent transition-all"
                  />
                </div>
              </div>

              {/* Photo Upload Attachment */}
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-[10px] font-bold uppercase tracking-wider text-signal-accent">
                  3. ATTACH EVIDENCE / PHOTO OF BLOCKED ROAD (OPTIONAL)
                </label>
                <div className="flex items-center gap-3 border border-dashed border-[#35332C] p-3 rounded-2xl bg-[#24221D]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-[10px] font-mono text-[#E4E1D8] file:mr-3 file:border file:border-[#35332C] file:bg-[#1C1B17] file:px-3 file:py-1 file:rounded-xl file:text-[9px] file:font-mono file:font-bold file:text-signal-accent hover:file:border-signal-accent"
                  />
                  {photoPreview && (
                    <div className="relative h-12 w-16 shrink-0 rounded-xl border border-signal-accent overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Blocked Road Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute top-0 right-0 bg-[#A6403A] px-1 text-[7px] text-white"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="situation-notes" className="font-display text-[10px] font-bold uppercase tracking-wider text-signal-accent">
                  4. SITUATION DETAILS / LANDMARK NOTES
                </label>
                <textarea
                  id="situation-notes"
                  rows={2}
                  placeholder="Describe exact obstruction, stranded passengers, or medical emergency requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border border-[#35332C] bg-[#24221D] p-3 rounded-xl text-xs font-mono text-white outline-none focus:border-signal-accent transition-all"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex items-center justify-center gap-2 border border-[#A6403A] bg-[#A6403A]/20 py-3 rounded-2xl text-xs font-display font-black tracking-widest text-[#FAF9F6] hover:bg-[#A6403A]/40 uppercase transition-all shadow-[0_0_15px_rgba(166,64,58,0.3)] disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>{isSubmitting ? 'TRANSMITTING INCIDENT TO RESCUE COMMAND...' : '🚨 TRANSMIT GRIEVANCE & REQUEST RESCUE'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: ACTIVE INCIDENT QUEUE & RESCUE DISPATCH */}
          {activeTab === 'reports' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#35332C] pb-2">
                <div className="font-mono text-xs text-[#E4E1D8]">
                  TOTAL INCIDENT REPORTS:{' '}
                  <span className="font-bold text-signal-accent">{reports.length}</span> across{' '}
                  <span className="font-bold text-white">{roadIncidentStats.size}</span> road corridors
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className="border border-signal-accent bg-signal-accent/20 px-3 py-1 rounded-xl text-[9px] font-mono text-[#FAF9F6] font-bold hover:bg-signal-accent/40 transition-all"
                >
                  + REPORT NEW BLOCKAGE
                </button>
              </div>

              {/* Grouped Incidents by Road Corridor */}
              <div className="flex flex-col gap-4">
                {Array.from(roadIncidentStats.entries()).map(([edgeId, data]) => {
                  const uniqueCount = data.uniqueVehicles.size;
                  let priorityBadge = 'P3 NORMAL (1 VEHICLE)';
                  let priorityBorder = 'border-[#35332C]';
                  let priorityBg = 'bg-[#24221D]';
                  let badgeColor = 'bg-[#1C1B17] text-[#E4E1D8] border-[#35332C]';

                  if (uniqueCount >= 3) {
                    priorityBadge = `P1 CRITICAL ESCALATION (${uniqueCount} STRANDED VEHICLES)`;
                    priorityBorder = 'border-[#A6403A] shadow-[0_0_15px_rgba(166,64,58,0.25)]';
                    priorityBg = 'bg-[#351C1A]';
                    badgeColor = 'bg-[#A6403A] text-white border-[#A6403A] animate-pulse';
                  } else if (uniqueCount === 2) {
                    priorityBadge = `P2 HIGH PRIORITY (${uniqueCount} STRANDED VEHICLES)`;
                    priorityBorder = 'border-[#B8863B] shadow-[0_0_12px_rgba(184,134,59,0.15)]';
                    priorityBg = 'bg-[#352718]';
                    badgeColor = 'bg-[#B8863B] text-black font-bold border-[#B8863B]';
                  }

                  const first = data.reports[0];
                  const hasDispatched = data.reports.some((r) => r.rescueStatus === 'dispatched');

                  return (
                    <div key={edgeId} className={`border ${priorityBorder} ${priorityBg} p-4 rounded-2xl flex flex-col gap-3 transition-all`}>
                      {/* Corridor Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#35332C]/60 pb-2.5">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-signal-accent">{edgeId}</span>
                            <span className={`border px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase ${badgeColor}`}>
                              {priorityBadge}
                            </span>
                          </div>
                          <span className="font-display text-sm font-bold text-[#FAF9F6] mt-0.5">
                            {first.fromNodeName} ↔ {first.toNodeName}
                          </span>
                        </div>

                        {/* Dispatch Action Button */}
                        <div className="flex items-center gap-2">
                          {hasDispatched ? (
                            <div className="border border-[#4B7B4E] bg-[#4B7B4E]/15 px-3 py-1 rounded-full text-[9px] font-mono text-[#4B7B4E] font-bold flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#4B7B4E] animate-pulse" />
                              <span>RESCUE SQUAD ACTIVE ({first.dispatchedTeamName})</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDispatchRescue(edgeId, `${first.fromNodeName} ↔ ${first.toNodeName}`)}
                              className="border border-[#A6403A] bg-[#A6403A]/20 hover:bg-[#A6403A]/40 px-3.5 py-1.5 rounded-xl text-[10px] font-display font-black tracking-wider text-[#FAF9F6] uppercase transition-all shadow-[0_0_10px_rgba(166,64,58,0.3)]"
                            >
                              🚀 DISPATCH RESCUE TEAM NOW
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Citizen Reports on this Corridor */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {data.reports.map((report) => (
                          <div key={report.id} className="border border-[#35332C] bg-[#1C1B17] p-3 rounded-xl flex flex-col gap-1.5">
                            <div className="flex items-center justify-between font-mono text-[9px]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white uppercase">{report.reporterName}</span>
                                <span className="bg-[#24221D] border border-[#35332C] px-1.5 py-0.2 rounded text-signal-accent font-bold">
                                  {report.vehicleNumber}
                                </span>
                              </div>
                              <span className="text-[#E4E1D8]/60">{report.contactNumber}</span>
                            </div>

                            <p className="text-[10px] font-mono text-[#E4E1D8] italic line-clamp-2">
                              &ldquo;{report.description}&rdquo;
                            </p>

                            {report.photoUrl && (
                              <div className="mt-1 h-20 w-32 rounded-xl border border-[#35332C] overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={report.photoUrl} alt="Reported blockage" className="h-full w-full object-cover" />
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[8px] font-mono text-[#E4E1D8]/60 border-t border-[#35332C]/40 pt-1 mt-0.5">
                              <span>TYPE: {report.blockageType.toUpperCase()}</span>
                              <span>STATUS: {report.rescueStatus.toUpperCase()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
