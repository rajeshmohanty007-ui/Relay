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
  { id: 'mudslide', label: 'Mudslide / Landslide' },
  { id: 'flood_inundation', label: 'Flash Flood / Deep Inundation' },
  { id: 'debris_tree', label: 'Fallen Tree / Power Cables Debris' },
  { id: 'bridge_damage', label: 'Bridge Structural Damage / Closure' },
  { id: 'road_collapse', label: 'Road Embankment Collapse' },
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

  
  const handleDispatchRescue = (edgeId: string, roadName: string) => {
    const teams = [
      'NDRF Disaster Response Unit Alpha',
      'Kerala State Emergency Rescue Squad-02',
      'Army Engineering Quick Clearance Team',
      'Civil Defense Amphibious Rescue Crew',
    ];
    const chosenTeam = teams[Math.floor(Math.random() * teams.length)];
    const eta = Math.floor(Math.random() * 8) + 6; 

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-struct-line bg-base-cream shadow-[0_0_50px_rgba(0,0,0,0.15)] overflow-hidden">
        {}
        <div className="flex items-center justify-between border-b border-struct-line bg-base-sand px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-status-danger bg-status-danger/15 text-status-danger shadow-sm">
              <svg className="w-5 h-5 text-status-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-sm font-black tracking-widest text-base-dark uppercase">
                CITIZEN ROAD GRIEVANCE & EMERGENCY RESCUE DISPATCH
              </h2>
              <p className="text-[9px] font-sans text-base-dark/70">
                Report impassable single-access roads, stranded vehicles & request priority rescue team dispatch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-struct-line bg-base-cream px-3.5 py-1.5 font-mono text-xs font-bold text-base-dark hover:text-base-dark hover:border-signal-accent hover:bg-base-sand transition-all cursor-pointer"
          >
            ✕ CLOSE
          </button>
        </div>

        {}
        {latestNotification && (
          <div className="bg-status-danger/20 border-b border-status-danger px-6 py-2.5 flex items-center justify-between animate-in slide-in-from-top-2 duration-200 shrink-0">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-status-danger animate-ping" />
              <div className="font-mono text-xs text-base-dark">
                <span className="font-bold text-status-danger uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <svg className="w-3.5 h-3.5 inline-block align-text-bottom mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  RESCUE UNIT EN ROUTE:
                </span>{' '}
                <span className="text-base-dark font-bold">{latestNotification.teamName}</span> dispatched to stranded vehicle{' '}
                <span className="bg-base-sand px-2 py-0.5 rounded-md border border-status-danger/50 text-signal-accent font-bold">
                  {latestNotification.vehicleNumber}
                </span>{' '}
                at {latestNotification.roadName} (ETA ~{latestNotification.etaMin} mins).
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLatestNotification(null)}
              className="font-mono text-[9px] text-base-dark/70 hover:text-base-dark border border-struct-line px-2 py-0.5 rounded-lg cursor-pointer"
            >
              DISMISS
            </button>
          </div>
        )}

        {}
        <div className="flex border-b border-struct-line bg-base-sand px-6 pt-2.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 rounded-t-xl border-t border-l border-r px-4 py-2 text-xs font-display font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'border-signal-accent bg-base-cream text-signal-accent'
                : 'border-transparent bg-transparent text-base-dark/60 hover:text-base-dark'
            }`}
          >
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              SUBMIT GRIEVANCE
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 rounded-t-xl border-t border-l border-r px-4 py-2 text-xs font-display font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'border-signal-accent bg-base-cream text-signal-accent'
                : 'border-transparent bg-transparent text-base-dark/60 hover:text-base-dark'
            }`}
          >
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              ACTIVE INCIDENT QUEUE
            </span>
            <span className="bg-signal-accent/20 border border-signal-accent/50 text-signal-accent px-2 py-0.5 rounded-full text-[9px] font-mono font-bold">
              {reports.length}
            </span>
          </button>
        </div>

        {}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-base-cream">
          {}
          {activeTab === 'form' && (
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex flex-col gap-4">
              {submitSuccess && (
                <div className="border border-status-ok bg-status-ok/10 p-3.5 rounded-2xl text-status-ok font-mono text-xs flex items-center gap-2.5 animate-in fade-in shadow-sm">
                  <svg className="w-4 h-4 shrink-0 text-status-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    Report received successfully! Dispatched to disaster management control. Priority escalated based on vehicle registration.
                  </span>
                </div>
              )}

              {}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="road-selection" className="font-display text-[10px] font-bold uppercase tracking-wider text-signal-accent">
                  1. SELECT BLOCKED ROAD CORRIDOR (POINT A ↔ POINT B) *
                </label>
                <select
                  id="road-selection"
                  value={selectedEdgeId}
                  onChange={(e) => setSelectedEdgeId(e.target.value)}
                  className="border border-struct-line bg-base-cream px-3.5 py-2.5 rounded-xl text-xs font-mono text-base-dark outline-none focus:border-signal-accent transition-all"
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

              {}
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-[10px] font-bold uppercase tracking-wider text-signal-accent">
                  2. BLOCKAGE / HAZARD SEVERITY *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BLOCKAGE_TYPES.map((type) => {
                    let svgIcon = null;
                    if (type.id === 'mudslide') {
                      svgIcon = (
                        <svg className="w-4 h-4 text-status-warn shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="12 2 2 22 22 22" />
                        </svg>
                      );
                    } else if (type.id === 'flood_inundation') {
                      svgIcon = (
                        <svg className="w-4 h-4 text-signal-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.5c-4.142 0-7.5-3.358-7.5-7.5C4.5 9.385 12 2.5 12 2.5S19.5 9.385 19.5 14c0 4.142-3.358 7.5-7.5 7.5z" />
                        </svg>
                      );
                    } else if (type.id === 'debris_tree') {
                      svgIcon = (
                        <svg className="w-4 h-4 text-status-ok shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M5 12h14M8 7l4-4 4 4m-8 10l4 4 4-4" />
                        </svg>
                      );
                    } else if (type.id === 'bridge_damage') {
                      svgIcon = (
                        <svg className="w-4 h-4 text-[#997460] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      );
                    } else if (type.id === 'road_collapse') {
                      svgIcon = (
                        <svg className="w-4 h-4 text-status-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      );
                    }

                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setBlockageType(type.id)}
                        className={`flex items-center gap-2.5 border p-2.5 rounded-xl text-left text-xs font-mono transition-all cursor-pointer ${
                          blockageType === type.id
                            ? 'border-status-danger bg-status-danger/25 text-status-danger font-bold shadow-[0_0_10px_rgba(153,116,96,0.25)]'
                            : 'border-struct-line bg-base-cream text-base-dark/70 hover:text-base-dark hover:bg-base-sand'
                        }`}
                      >
                        <span className="shrink-0">{svgIcon}</span>
                        <span className="text-[11px] leading-tight">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-struct-line bg-base-sand p-3.5 rounded-2xl shadow-sm">
                <div className="flex flex-col gap-1">
                  <label htmlFor="vehicle-reg" className="font-display text-[9px] font-bold uppercase tracking-wider text-base-dark">
                    VEHICLE REG (UNIQUE ID) *
                  </label>
                  <input
                    id="vehicle-reg"
                    type="text"
                    required
                    placeholder="e.g. KL-07-CD-4921"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="border border-struct-line bg-base-cream px-3 py-1.5 rounded-xl text-xs font-mono text-signal-accent uppercase font-bold outline-none focus:border-signal-accent transition-all"
                  />
                  <span className="text-[8px] font-mono text-base-dark/60">Auto-escalates priority on multiple reports</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="reporter-name" className="font-display text-[9px] font-bold uppercase tracking-wider text-base-dark">
                    REPORTER FULL NAME *
                  </label>
                  <input
                    id="reporter-name"
                    type="text"
                    required
                    placeholder="e.g. Rajesh Mohanty"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="border border-struct-line bg-base-cream px-3 py-1.5 rounded-xl text-xs font-mono text-base-dark outline-none focus:border-signal-accent transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="contact-num" className="font-display text-[9px] font-bold uppercase tracking-wider text-base-dark">
                    CONTACT PHONE *
                  </label>
                  <input
                    id="contact-num"
                    type="tel"
                    required
                    placeholder="+91 98470 XXXXX"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="border border-struct-line bg-base-cream px-3 py-1.5 rounded-xl text-xs font-mono text-base-dark outline-none focus:border-signal-accent transition-all"
                  />
                </div>
              </div>

              {}
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-[10px] font-bold uppercase tracking-wider text-signal-accent">
                  3. ATTACH EVIDENCE / PHOTO OF BLOCKED ROAD (OPTIONAL)
                </label>
                <div className="flex items-center gap-3 border border-dashed border-struct-line p-3 rounded-2xl bg-base-sand">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-[10px] font-mono text-base-dark file:mr-3 file:border file:border-struct-line file:bg-base-cream file:px-3 file:py-1 file:rounded-xl file:text-[9px] file:font-mono file:font-bold file:text-signal-accent hover:file:border-signal-accent"
                  />
                  {photoPreview && (
                    <div className="relative h-12 w-16 shrink-0 rounded-xl border border-signal-accent overflow-hidden">
                      {}
                      <img src={photoPreview} alt="Blocked Road Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute top-0 right-0 bg-status-danger px-1 text-[7px] text-white cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {}
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
                  className="border border-struct-line bg-base-cream p-3 rounded-xl text-xs font-mono text-base-dark outline-none focus:border-signal-accent transition-all"
                />
              </div>

              {}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex items-center justify-center gap-2 border border-status-danger bg-status-danger py-3 rounded-2xl text-xs font-display font-black tracking-widest text-white hover:bg-[#b05d47] uppercase transition-all shadow-[0_0_15px_rgba(153,116,96,0.3)] disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {isSubmitting ? (
                    'TRANSMITTING INCIDENT TO RESCUE COMMAND...'
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      TRANSMIT GRIEVANCE & REQUEST RESCUE
                    </>
                  )}
                </span>
              </button>
            </form>
          )}

          {}
          {activeTab === 'reports' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-struct-line pb-2">
                <div className="font-mono text-xs text-base-dark">
                  TOTAL INCIDENT REPORTS:{' '}
                  <span className="font-bold text-signal-accent">{reports.length}</span> across{' '}
                  <span className="font-bold text-base-dark">{roadIncidentStats.size}</span> road corridors
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className="border border-signal-accent bg-signal-accent/20 px-3 py-1 rounded-xl text-[9px] font-mono text-signal-accent font-bold hover:bg-signal-accent/40 transition-all cursor-pointer"
                >
                  + REPORT NEW BLOCKAGE
                </button>
              </div>

              {}
              <div className="flex flex-col gap-4">
                {Array.from(roadIncidentStats.entries()).map(([edgeId, data]) => {
                  const uniqueCount = data.uniqueVehicles.size;
                  let priorityBadge = 'P3 NORMAL (1 VEHICLE)';
                  let priorityBorder = 'border-struct-line';
                  let priorityBg = 'bg-base-sand';
                  let badgeColor = 'bg-base-cream text-base-dark border-struct-line';

                  if (uniqueCount >= 3) {
                    priorityBadge = `P1 CRITICAL ESCALATION (${uniqueCount} STRANDED VEHICLES)`;
                    priorityBorder = 'border-[#997460] shadow-[0_0_15px_rgba(153,116,96,0.25)]';
                    priorityBg = 'bg-red-50';
                    badgeColor = 'bg-status-danger text-white border-status-danger animate-pulse';
                  } else if (uniqueCount === 2) {
                    priorityBadge = `P2 HIGH PRIORITY (${uniqueCount} STRANDED VEHICLES)`;
                    priorityBorder = 'border-[#6AADAB] shadow-[0_0_12px_rgba(106,173,171,0.15)]';
                    priorityBg = 'bg-amber-50';
                    badgeColor = 'bg-status-warn text-white font-bold border-status-warn';
                  }

                  const first = data.reports[0];
                  const hasDispatched = data.reports.some((r) => r.rescueStatus === 'dispatched');

                  return (
                    <div key={edgeId} className={`border ${priorityBorder} ${priorityBg} p-4 rounded-2xl flex flex-col gap-3 transition-all`}>
                      {}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-struct-line/60 pb-2.5">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-signal-accent">{edgeId}</span>
                            <span className={`border px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase ${badgeColor}`}>
                              {priorityBadge}
                            </span>
                          </div>
                          <span className="font-display text-sm font-bold text-base-dark mt-0.5">
                            {first.fromNodeName} ↔ {first.toNodeName}
                          </span>
                        </div>

                        {}
                        <div className="flex items-center gap-2">
                          {hasDispatched ? (
                            <div className="border border-[#206E6B] bg-[#206E6B]/15 px-3 py-1 rounded-full text-[9px] font-mono text-[#206E6B] font-bold flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#206E6B] animate-pulse" />
                              <span>RESCUE SQUAD ACTIVE ({first.dispatchedTeamName})</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDispatchRescue(edgeId, `${first.fromNodeName} ↔ ${first.toNodeName}`)}
                              className="border border-status-danger bg-status-danger hover:bg-[#b05d47] px-3.5 py-1.5 rounded-xl text-[10px] font-display font-black tracking-wider text-white uppercase transition-all shadow-[0_0_10px_rgba(153,116,96,0.3)] cursor-pointer flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" fill="currentColor" />
                              </svg>
                              DISPATCH RESCUE TEAM NOW
                            </button>
                          )}
                        </div>
                      </div>

                      {}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {data.reports.map((report) => (
                          <div key={report.id} className="border border-struct-line bg-base-cream p-3 rounded-xl flex flex-col gap-1.5">
                            <div className="flex items-center justify-between font-mono text-[9px]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-base-dark uppercase">{report.reporterName}</span>
                                <span className="bg-base-sand border border-struct-line px-1.5 py-0.2 rounded text-signal-accent font-bold">
                                  {report.vehicleNumber}
                                </span>
                              </div>
                              <span className="text-base-dark/60">{report.contactNumber}</span>
                            </div>

                            <p className="text-[10px] font-mono text-base-dark italic line-clamp-2">
                              &ldquo;{report.description}&rdquo;
                            </p>

                            {report.photoUrl && (
                              <div className="mt-1 h-20 w-32 rounded-xl border border-struct-line overflow-hidden">
                                {}
                                <img src={report.photoUrl} alt="Reported blockage" className="h-full w-full object-cover" />
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[8px] font-mono text-base-dark/60 border-t border-struct-line/40 pt-1 mt-0.5">
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
