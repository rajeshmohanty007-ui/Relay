import { useState, useMemo } from 'react';
import type { Node, Edge, Convoy } from '../lib/types';
import { projectNodes, type ProjectedNode } from '../lib/projection';
import type { WaterSensor } from '../lib/waterSensors';

export type MapLayer = 'grid' | 'contours' | 'edges' | 'nodes' | 'convoys' | 'sensors' | 'labels';

export const ALL_MAP_LAYERS: Set<MapLayer> = new Set(['grid', 'contours', 'edges', 'nodes', 'convoys', 'sensors', 'labels']);

export interface MapViewProps {
  nodes: Node[];
  edges: Edge[];
  convoys: Convoy[];
  sensors?: WaterSensor[];
  visibleLayers?: Set<MapLayer>;
  /** Edge IDs of a citizen-planned route to draw as a highlighted overlay on top of the road network. */
  highlightedEdgeIds?: Set<string>;
  routeOriginId?: string;
  routeDestId?: string;
}

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 640;

// Returns status color for a shelter node based on remaining stock hours
function getShelterStatusColor(node: Node): string {
  if (!node.criticalSupplyNeed) return '#206E6B'; // Pine Teal: Stable
  const hoursLeft = node.criticalSupplyNeed.hoursOfStockRemaining;
  if (hoursLeft <= 3.0) return '#997460'; // Terracotta: Critical
  if (hoursLeft <= 5.0) return '#6AADAB'; // Slate Teal: Warning
  return '#206E6B'; // Pine Teal: Stable
}

// Tactical style configuration matching NDMA alerts
const EDGE_STYLE: Record<Edge['status'], { stroke: string; strokeWidth: number; dashArray?: string }> = {
  clear: { stroke: '#206E6B', strokeWidth: 2 }, // Pine teal line
  degraded: { stroke: '#6AADAB', strokeWidth: 2.5, dashArray: '4 4' }, // Slate Teal warning dash
  blocked: { stroke: '#997460', strokeWidth: 3.5 }, // Terracotta placard alert
};

export default function MapViewTopo({
  nodes,
  edges,
  convoys,
  sensors = [],
  visibleLayers = ALL_MAP_LAYERS,
  highlightedEdgeIds,
  routeOriginId,
  routeDestId,
}: MapViewProps) {
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);

  const projected = useMemo(() => projectNodes(nodes, VIEW_WIDTH, VIEW_HEIGHT), [nodes]);

  const positionsById = useMemo(() => {
    const map = new Map<string, ProjectedNode>();
    for (const p of projected) map.set(p.id, p);
    return map;
  }, [projected]);

  const edgesById = useMemo(() => {
    const map = new Map<string, Edge>();
    for (const e of edges) map.set(e.id, e);
    return map;
  }, [edges]);

  // Project sensors to viewport coordinates
  const sensorPositions = useMemo(() => {
    if (nodes.length === 0 || sensors.length === 0) return [];
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const n of nodes) {
      if (n.lat < minLat) minLat = n.lat;
      if (n.lat > maxLat) maxLat = n.lat;
      if (n.lng < minLng) minLng = n.lng;
      if (n.lng > maxLng) maxLng = n.lng;
    }
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;
    const paddingX = VIEW_WIDTH * 0.1;
    const paddingY = VIEW_HEIGHT * 0.1;
    const usableW = VIEW_WIDTH - paddingX * 2;
    const usableH = VIEW_HEIGHT - paddingY * 2;

    return sensors.map((sensor) => {
      const xFrac = (sensor.lng - minLng) / lngRange;
      const yFrac = 1 - (sensor.lat - minLat) / latRange;
      return {
        ...sensor,
        x: paddingX + xFrac * usableW,
        y: paddingY + yFrac * usableH,
      };
    });
  }, [nodes, sensors]);

  // Dynamically calculate river paths aligned with actual graph nodes & bridge junctions
  const { periyarPath, canalPath, crossings } = useMemo(() => {
    const pDam = positionsById.get('junc_dam_road');
    const pTea = positionsById.get('village_tea_foothills');
    const pWeir = positionsById.get('village_weir_quarters');
    const pRiverbank = positionsById.get('village_riverbank');
    const pRBN = positionsById.get('junc_river_bridge_n');
    const pCentral = positionsById.get('junc_central_cross');
    const pDelta = positionsById.get('shelter_delta_stadium');
    const pDeltaSplit = positionsById.get('junc_delta_split');
    const pMarsh = positionsById.get('village_marshland_bend');

    const pCanalBridge = positionsById.get('junc_canal_bridge');
    const pCanalSide = positionsById.get('village_canal_side');
    const pWestCulvert = positionsById.get('junc_west_culvert');
    const pCauseway = positionsById.get('village_causeway_haven');
    const pWestHall = positionsById.get('shelter_west_hall');
    const pMangrove = positionsById.get('village_mangrove_edge');

    let pMain = '';
    let pCanal = '';
    const crossList: Array<{ id: string; name: string; x: number; y: number; edgeId: string }> = [];

    if (pDam && pRBN && pCentral && pDelta) {
      const damMidX = pTea ? (pDam.x + pTea.x) / 2 : pDam.x + 10;
      const damMidY = pTea ? (pDam.y + pTea.y) / 2 : pDam.y + 15;

      pMain = `M ${pDam.x + 40},${pDam.y - 30} ` +
        `C ${pDam.x + 20},${pDam.y - 10} ${damMidX + 10},${damMidY - 10} ${damMidX},${damMidY} ` +
        `C ${pWeir ? pWeir.x : damMidX - 40},${pWeir ? pWeir.y : damMidY + 40} ${pRiverbank ? pRiverbank.x + 20 : pRBN.x + 40},${pRiverbank ? pRiverbank.y - 10 : pRBN.y - 30} ${pRBN.x},${pRBN.y} ` +
        `C ${pCentral.x + 30},${pRBN.y + 20} ${pCentral.x + 25},${pCentral.y} ${(pCentral.x + pDelta.x) / 2},${(pCentral.y + pDelta.y) / 2} ` +
        `C ${pDelta.x + 10},${pDelta.y - 10} ${pDeltaSplit ? pDeltaSplit.x + 20 : pDelta.x + 20},${pDelta.y + 20} ${pMarsh ? pMarsh.x : pDelta.x},${pMarsh ? pMarsh.y + 30 : pDelta.y + 50}`;

      crossList.push({
        id: 'cross_dam',
        name: 'Dam Overpass Spillway',
        x: damMidX,
        y: damMidY,
        edgeId: 'edge_jdam_vtea',
      });
      crossList.push({
        id: 'cross_north_causeway',
        name: 'Periyar North Causeway Bridge',
        x: pRBN.x,
        y: pRBN.y,
        edgeId: 'edge_jrbn_jcentral',
      });
    }

    if (pCanalBridge && pWestCulvert) {
      const causewayMidX = pCauseway && pWestHall ? (pCauseway.x + pWestHall.x) / 2 : pWestCulvert.x - 30;
      const causewayMidY = pCauseway && pWestHall ? (pCauseway.y + pWestHall.y) / 2 : pWestCulvert.y - 30;

      const pStart = pWeir || pCanalBridge;

      pCanal = `M ${pStart.x},${pStart.y} ` +
        `C ${pStart.x - 20},${pStart.y + 10} ${pCanalBridge.x + 20},${pCanalBridge.y - 10} ${pCanalBridge.x},${pCanalBridge.y} ` +
        `C ${pCanalSide ? pCanalSide.x : (pCanalBridge.x + pWestCulvert.x) / 2},${pCanalSide ? pCanalSide.y : pCanalBridge.y + 20} ${pWestCulvert.x + 20},${pWestCulvert.y - 15} ${pWestCulvert.x},${pWestCulvert.y} ` +
        `C ${pWestCulvert.x - 20},${pWestCulvert.y + 10} ${causewayMidX + 15},${causewayMidY - 15} ${causewayMidX},${causewayMidY} ` +
        `C ${causewayMidX - 25},${causewayMidY + 20} ${pMangrove ? pMangrove.x - 10 : causewayMidX - 40},${pMangrove ? pMangrove.y : causewayMidY + 50} ${pMangrove ? pMangrove.x - 20 : causewayMidX - 50},${pMangrove ? pMangrove.y + 40 : causewayMidY + 70}`;

      crossList.push({
        id: 'cross_canal_bridge',
        name: 'Grand Canal Sluice Bridge',
        x: pCanalBridge.x,
        y: pCanalBridge.y,
        edgeId: 'edge_jcanalbridge_sdelta',
      });
      crossList.push({
        id: 'cross_west_culvert',
        name: 'West Canal Culvert Junction',
        x: pWestCulvert.x,
        y: pWestCulvert.y,
        edgeId: 'edge_jwestculvert_swest',
      });
      if (pCauseway && pWestHall) {
        crossList.push({
          id: 'cross_causeway_haven',
          name: 'Causeway Haven Tidal Sluice',
          x: causewayMidX,
          y: causewayMidY,
          edgeId: 'edge_vcauseway_swest',
        });
      }
    }

    return { periyarPath: pMain, canalPath: pCanal, crossings: crossList };
  }, [positionsById]);

  // Generate grid points for background instrumentation panel theme
  const gridPoints = useMemo(() => {
    const points = [];
    const step = 60;
    for (let x = step; x < VIEW_WIDTH; x += step) {
      for (let y = step; y < VIEW_HEIGHT; y += step) {
        points.push({ x, y });
      }
    }
    return points;
  }, []);

  const activeSensor = useMemo(() => {
    if (!selectedSensorId) return null;
    return sensorPositions.find((s) => s.id === selectedSensorId) || null;
  }, [selectedSensorId, sensorPositions]);

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-full w-full bg-[#EDE4DF] border border-struct-line"
      >
        <defs>
          {/* River Water Flow Glow Filter */}
          <filter id="waterGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Hazard Pulse Animation */}
          <radialGradient id="hazardGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#997460" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#b05d47" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#EDE4DF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Tactical Grid Lines/Dots */}
        {visibleLayers.has('grid') && (
          <g opacity="0.15">
            {gridPoints.map((p, i) => (
              <path
                key={i}
                d={`M ${p.x - 2} ${p.y} L ${p.x + 2} ${p.y} M ${p.x} ${p.y - 2} L ${p.x} ${p.y + 2}`}
                stroke="#206E6B"
                strokeWidth={1}
              />
            ))}
          </g>
        )}

        {/* 2. Topographic Contour Line Texture (Under the graph) */}
        {visibleLayers.has('contours') && (
          <g opacity="0.08" stroke="#206E6B" strokeWidth="0.75" fill="none">
            {/* Ridge Hills North */}
            <path d="M 100,50 C 200,40 300,90 350,150 C 380,200 280,280 180,260 C 100,240 50,150 100,50 Z" />
            <path d="M 120,70 C 200,60 280,100 320,150 C 350,190 260,260 170,240 C 100,220 70,150 120,70 Z" />
            <path d="M 140,90 C 200,80 260,110 290,150 C 320,180 240,240 160,220 C 100,200 90,150 140,90 Z" />

            {/* Southern Elevations */}
            <path d="M 600,450 C 700,420 850,450 880,520 C 900,580 800,630 680,610 C 600,590 550,500 600,450 Z" />
            <path d="M 620,470 C 700,445 830,470 850,525 C 870,575 780,615 670,595 C 600,575 570,505 620,470 Z" />
            <path d="M 640,490 C 700,470 810,490 830,530 C 840,570 760,600 660,580 C 600,560 590,510 640,490 Z" />
          </g>
        )}

        {/* 3. River Flow Channels & Hydrological Waterways (Dynamically Aligned through Road Network) */}
        {visibleLayers.has('contours') && (
          <g opacity="0.85">
            {/* Main Periyar River Channel */}
            {periyarPath && (
              <>
                <path
                  d={periyarPath}
                  fill="none"
                  stroke="#DFEDED"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={periyarPath}
                  fill="none"
                  stroke="#6AADAB"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
                <path
                  d={periyarPath}
                  fill="none"
                  stroke="#206E6B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="14 18"
                  className="animate-pulse"
                />
              </>
            )}

            {/* Grand Canal Tributary & Western Culverts */}
            {canalPath && (
              <>
                <path
                  d={canalPath}
                  fill="none"
                  stroke="#DFEDED"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={canalPath}
                  fill="none"
                  stroke="#6AADAB"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />
                <path
                  d={canalPath}
                  fill="none"
                  stroke="#206E6B"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="10 14"
                />
              </>
            )}

            {/* Bridge Culvert / Sluice Gate Overpass Indicators across the Road network */}
            {crossings.map((cross) => (
              <g key={cross.id} transform={`translate(${cross.x}, ${cross.y})`}>
                {/* Bridge Deck Base */}
                <rect
                  x="-8"
                  y="-3"
                  width="16"
                  height="6"
                  fill="#DFEDED"
                  stroke="#206E6B"
                  strokeWidth="1"
                  transform="rotate(45)"
                />
                {/* Mini Bridge Rail Icon */}
                <line x1="-6" y1="-4" x2="6" y2="-4" stroke="#206E6B" strokeWidth="1" />
                <line x1="-6" y1="4" x2="6" y2="4" stroke="#206E6B" strokeWidth="1" />
              </g>
            ))}
          </g>
        )}

        {/* 4. Edges (Roads) */}
        {visibleLayers.has('edges') && (
          <g>
            {edges.map((edge) => {
              const from = positionsById.get(edge.fromNodeId);
              const to = positionsById.get(edge.toNodeId);
              if (!from || !to) return null;
              const style = EDGE_STYLE[edge.status];
              return (
                <g key={edge.id}>
                  {/* Underlying glowing track line for degraded or blocked roads */}
                  {edge.status !== 'clear' && (
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={style.stroke}
                      strokeWidth={style.strokeWidth + 4}
                      opacity="0.15"
                    />
                  )}
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.dashArray}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* 4b. Citizen route planner highlight overlay */}
        {highlightedEdgeIds && highlightedEdgeIds.size > 0 && (
          <g>
            {edges
              .filter((edge) => highlightedEdgeIds.has(edge.id))
              .map((edge) => {
                const from = positionsById.get(edge.fromNodeId);
                const to = positionsById.get(edge.toNodeId);
                if (!from || !to) return null;
                return (
                  <g key={`hl-${edge.id}`}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="#EC4899"
                      strokeWidth={7}
                      strokeLinecap="round"
                      opacity="0.25"
                    />
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="#EC4899"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeDasharray="10 8"
                    >
                      <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.6s" repeatCount="indefinite" />
                    </line>
                  </g>
                );
              })}
          </g>
        )}

        {/* 5. Hydrological Water Level Sensors & High Water Level Crossing Alerts */}
        {visibleLayers.has('sensors') && (
          <g>
            {sensorPositions.map((sensor) => {
              if (isNaN(sensor.x) || isNaN(sensor.y)) return null;

              const isCritical = sensor.status === 'critical';
              const isWarning = sensor.status === 'warning';
              const isSubmerged = sensor.roadSubmersionDepthM > 0;
              const isElevated = isCritical || isWarning || isSubmerged;
              const isSelected = selectedSensorId === sensor.id;

              let beaconColor = '#4B7B4E'; // Green
              let glowColor = 'rgba(75,123,78,0.4)';
              if (isCritical) {
                beaconColor = '#A6403A'; // Rust Red
                glowColor = 'rgba(166,64,58,0.7)';
              } else if (isWarning || sensor.status === 'advisory') {
                beaconColor = '#B8863B'; // Amber Ochre
                glowColor = 'rgba(184,134,59,0.6)';
              }

              return (
                <g
                  key={sensor.id}
                  onClick={() => setSelectedSensorId(sensor.id)}
                  className="cursor-pointer group"
                >
                  {/* Selected Indicator Ring */}
                  {isSelected && (
                    <circle
                      cx={sensor.x}
                      cy={sensor.y}
                      r={18}
                      fill="none"
                      stroke="#2C4A3E"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      className="animate-spin"
                    />
                  )}

                  {/* High Water Level Flood Inundation Wave directly over the Road Crossing */}
                  {isElevated && (
                    <g>
                      {/* Pulsing Hazard Flood Radial Ring */}
                      <circle
                        cx={sensor.x}
                        cy={sensor.y}
                        r={24}
                        fill="url(#hazardGlow)"
                        className="animate-ping"
                        opacity="0.75"
                      />
                      <circle
                        cx={sensor.x}
                        cy={sensor.y}
                        r={16}
                        fill="none"
                        stroke={beaconColor}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        opacity="0.8"
                      />

                      {/* High Water Crossing Warning Placard directly at the intersection */}
                      <g transform={`translate(${sensor.x}, ${sensor.y - 18})`}>
                        <rect
                          x="-52"
                          y="-10"
                          width="104"
                          height="15"
                          fill="#1C1B17"
                          stroke={beaconColor}
                          strokeWidth="1.2"
                          className="filter drop-shadow-[0_0_6px_rgba(166,64,58,0.5)] group-hover:stroke-signal-accent"
                        />
                        <text
                          x="0"
                          y="1"
                          textAnchor="middle"
                          fill={isCritical ? '#FAF9F6' : '#FAF9F6'}
                          fontSize="7"
                          fontFamily="monospace"
                          fontWeight="bold"
                          letterSpacing="0.5"
                        >
                          {isSubmerged
                            ? `INUNDATION: +${sensor.roadSubmersionDepthM.toFixed(1)}m`
                            : `HIGH WATER: ${sensor.currentLevelM.toFixed(1)}m`}
                        </text>
                      </g>
                    </g>
                  )}

                  {/* Sensor Station Buoy Beacon */}
                  <circle
                    cx={sensor.x}
                    cy={sensor.y}
                    r={isSelected ? 6.5 : 5}
                    fill={beaconColor}
                    stroke="#1C1B17"
                    strokeWidth={1.5}
                    className="filter drop-shadow-[0_0_4px_rgba(0,0,0,0.9)] transition-all group-hover:scale-125"
                    style={{ filter: `drop-shadow(0 0 5px ${glowColor})` }}
                  >
                    <title>{`${sensor.name} (${sensor.code}): ${sensor.currentLevelM.toFixed(2)}m (Crest: ${sensor.criticalLevelM}m) — Click for Telemetry`}</title>
                  </circle>

                  {/* Tactical Station Code & Level Tag */}
                  <g transform={`translate(${sensor.x}, ${sensor.y + 11})`}>
                    <rect
                      x="-32"
                      y="-6"
                      width="64"
                      height="11"
                      fill="#1C1B17"
                      stroke={isSelected ? '#2C4A3E' : '#35332C'}
                      strokeWidth={isSelected ? 1.2 : 0.75}
                      opacity="0.9"
                      className="group-hover:stroke-signal-accent"
                    />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      fill="#E4E1D8"
                      fontSize="6"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {sensor.code} <tspan fill={beaconColor}>{sensor.currentLevelM.toFixed(1)}m</tspan>
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        )}

        {/* 6. Nodes (Depots, Shelters, Villages, Junctions) */}
        {visibleLayers.has('nodes') && (
          <g>
            {nodes.map((node) => {
              const pos = positionsById.get(node.id);
              if (!pos) return null;

              let nodeElement = null;
              let labelColor = 'text-base-dark';

              if (node.type === 'depot') {
                // Signal Accent Solid Square
                labelColor = 'text-base-dark';
                nodeElement = (
                  <rect
                    x={pos.x - 7}
                    y={pos.y - 7}
                    width={14}
                    height={14}
                    fill="none"
                    stroke="#206E6B"
                    strokeWidth={2.5}
                    className="filter drop-shadow-[0_0_4px_rgba(32,110,107,0.4)]"
                  />
                );
              } else if (node.type === 'shelter') {
                // Diamond colored by stock alert level
                const alertColor = getShelterStatusColor(node);
                nodeElement = (
                  <rect
                    x={pos.x - 7}
                    y={pos.y - 7}
                    width={14}
                    height={14}
                    fill={alertColor}
                    stroke="#206E6B"
                    strokeWidth={1.5}
                    transform={`rotate(45 ${pos.x} ${pos.y})`}
                    className="filter drop-shadow-[0_0_4px_rgba(0,0,0,0.15)]"
                  />
                );
              } else if (node.type === 'village') {
                // Quiet structural dot
                nodeElement = (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={4}
                    fill="#206E6B"
                    stroke="#DFEDED"
                    strokeWidth={1.5}
                  />
                );
              } else {
                // Junction: Small crosshair point
                nodeElement = (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={2.5}
                    fill="#6AADAB"
                  />
                );
              }

              return (
                <g key={node.id}>
                  {/* Node shape */}
                  {nodeElement}

                  {/* Node label text */}
                  {visibleLayers?.has('labels') && (
                    <text
                      x={pos.x}
                      y={pos.y - 10}
                      textAnchor="middle"
                      className={`font-display text-[8px] font-bold tracking-wider uppercase ${labelColor}`}
                      fill="currentColor"
                    >
                      {node.name.replace(' Relief Shelter', '').replace(' Logistics Depot', '').replace(' Emergency Shelter', '')}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* 6b. Route Highlight Pins for Topo Map */}
        {routeOriginId && positionsById.has(routeOriginId) && (() => {
          const pos = positionsById.get(routeOriginId)!;
          return (
            <g key="topo-origin-pin" className="pointer-events-none select-none">
              <circle cx={pos.x} cy={pos.y} r={18} fill="#EC4899" opacity={0.15}>
                <animate attributeName="r" values="8;20;8" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={pos.x} cy={pos.y} r={12} fill="#EC4899" opacity={0.35} />
              <circle cx={pos.x} cy={pos.y} r={8} fill="#EC4899" stroke="#FFFFFF" strokeWidth={1.5} />
              <text x={pos.x} y={pos.y + 3} textAnchor="middle" className="font-mono text-[9px] font-black text-white fill-white select-none pointer-events-none">A</text>
            </g>
          );
        })()}

        {routeDestId && positionsById.has(routeDestId) && (() => {
          const pos = positionsById.get(routeDestId)!;
          return (
            <g key="topo-dest-pin" className="pointer-events-none select-none">
              <circle cx={pos.x} cy={pos.y} r={18} fill="#EC4899" opacity={0.15}>
                <animate attributeName="r" values="8;20;8" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={pos.x} cy={pos.y} r={12} fill="#EC4899" opacity={0.35} />
              <circle cx={pos.x} cy={pos.y} r={8} fill="#EC4899" stroke="#FFFFFF" strokeWidth={1.5} />
              <text x={pos.x} y={pos.y + 3} textAnchor="middle" className="font-mono text-[9px] font-black text-white fill-white select-none pointer-events-none">B</text>
            </g>
          );
        })()}

        {/* 7. Convoys (Active Operations) */}
        {visibleLayers.has('convoys') && (
          <g>
            {convoys
              .filter((convoy) => convoy.status !== 'arrived' && convoy.status !== 'pending' && convoy.currentEdgeId)
              .map((convoy) => {
                const edge = edgesById.get(convoy.currentEdgeId as string);
                if (!edge) return null;
                const posFrom = positionsById.get(edge.fromNodeId);
                const posTo = positionsById.get(edge.toNodeId);
                if (!posFrom || !posTo) return null;

                // Determine traversal direction on bidirectional edges
                let isReversed = false;
                const route = convoy.currentRoute || [];
                const routeIdx = route.indexOf(convoy.currentEdgeId as string);

                if (routeIdx >= 0 && routeIdx + 1 < route.length) {
                  const nextEdge = edgesById.get(route[routeIdx + 1]);
                  if (nextEdge) {
                    // The shared node with next edge is the exit node we're heading towards
                    if (edge.fromNodeId === nextEdge.fromNodeId || edge.fromNodeId === nextEdge.toNodeId) {
                      isReversed = true;
                    }
                  }
                } else if (routeIdx >= 0 && routeIdx === route.length - 1) {
                  // Final edge in the route: heading towards destNodeId
                  if (edge.fromNodeId === convoy.destNodeId) {
                    isReversed = true;
                  }
                } else if (edge.toNodeId === convoy.originNodeId || edge.fromNodeId === convoy.destNodeId) {
                  isReversed = true;
                }

                const start = isReversed ? posTo : posFrom;
                const end = isReversed ? posFrom : posTo;
                const t = Math.min(Math.max(convoy.positionProgress, 0), 1);
                const x = start.x + (end.x - start.x) * t;
                const y = start.y + (end.y - start.y) * t;

                let color = '#FAF9F6'; // Default
                let pulseColor = '#FAF9F6';
                if (convoy.status === 'enroute') {
                  color = '#4B7B4E'; // Green: Normal operation
                  pulseColor = '#4B7B4E';
                }
                if (convoy.status === 'rerouted') {
                  color = '#B8863B'; // Amber: Diverted
                  pulseColor = '#B8863B';
                }
                if (convoy.status === 'recalled') {
                  color = '#A6403A'; // Rust Red: Aborted
                  pulseColor = '#A6403A';
                }

                return (
                  <g
                    key={convoy.id}
                    className="transition-transform duration-700 ease-linear"
                  >
                    {/* Pulsing ring for active rerouted / enroute operations */}
                    {(convoy.status === 'rerouted' || convoy.status === 'enroute') && (
                      <circle
                        cx={x}
                        cy={y}
                        r={8}
                        fill="none"
                        stroke={pulseColor}
                        strokeWidth={1}
                        className="animate-ping opacity-60"
                      />
                    )}

                    {/* Convoy beacon */}
                    <circle
                      cx={x}
                      cy={y}
                      r={5}
                      fill={color}
                      stroke="#1C1B17"
                      strokeWidth={1.5}
                      className="filter drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]"
                    >
                      <title>{`${convoy.id} (${convoy.cargoType.toUpperCase()}) — ${convoy.status.toUpperCase()}`}</title>
                    </circle>

                    {/* Tactical tag */}
                    <text
                      x={x}
                      y={y + 11}
                      textAnchor="middle"
                      className="font-mono text-[7px] font-bold text-[#FAF9F6] bg-[#1C1B17]/90 px-1 py-0.2 rounded-full"
                      fill="currentColor"
                    >
                      {convoy.id}
                    </text>
                  </g>
                );
              })}
          </g>
        )}
      </svg>

      {/* Floating Tactical Inspection Panel when a sensor / crossing is clicked */}
      {activeSensor && (
        <div className="absolute bottom-4 right-4 z-30 flex w-84 flex-col rounded-2xl border border-struct-line bg-base-cream/95 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.1)] p-3.5 animate-in fade-in zoom-in-95 duration-150 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-struct-line/60 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-signal-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.5c-4.142 0-7.5-3.358-7.5-7.5C4.5 9.385 12 2.5 12 2.5S19.5 9.385 19.5 14c0 4.142-3.358 7.5-7.5 7.5z" />
              </svg>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-bold text-base-dark">{activeSensor.code}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[7px] font-mono font-bold uppercase ${activeSensor.status === 'critical'
                      ? 'bg-status-danger/10 text-status-danger border-status-danger/30'
                      : activeSensor.status === 'warning' || activeSensor.status === 'advisory'
                        ? 'bg-status-warn/15 text-status-warn border-status-warn/30'
                        : 'bg-status-ok/10 text-status-ok border-status-ok/30'
                      }`}
                  >
                    {activeSensor.status}
                  </span>
                </div>
                <span className="font-display text-[10px] font-bold text-base-dark block truncate max-w-[190px] mt-0.5">
                  {activeSensor.name}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSensorId(null)}
              className="font-mono text-[9px] text-base-dark/70 hover:text-base-dark border border-struct-line px-2 py-1 rounded-lg hover:bg-base-sand transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[8px] mb-2.5">
            <div className="border border-struct-line bg-base-sand p-2 rounded-xl">
              <span className="text-base-dark/60 block text-[7px]">STAGE / CREST LIMIT</span>
              <span className="font-bold text-[11px] text-base-dark">
                {activeSensor.currentLevelM.toFixed(2)}m{' '}
                <span className="text-[7px] text-base-dark/60">/ {activeSensor.criticalLevelM.toFixed(1)}m</span>
              </span>
            </div>
            <div className="border border-struct-line bg-base-sand p-2 rounded-xl">
              <span className="text-base-dark/60 block text-[7px]">RATE OF RISE</span>
              <span
                className={`font-bold text-[10px] ${activeSensor.rateOfRiseMPerHour > 0.3 ? 'text-status-warn' : 'text-base-dark'
                  }`}
              >
                {activeSensor.rateOfRiseMPerHour > 0
                  ? `▲ +${activeSensor.rateOfRiseMPerHour.toFixed(2)}m/h`
                  : `▼ ${activeSensor.rateOfRiseMPerHour.toFixed(2)}m/h`}
              </span>
            </div>
          </div>

          {/* Submersion Status */}
          <div className="border border-struct-line bg-base-sand p-2.5 rounded-xl font-mono text-[8px] mb-2 text-base-dark">
            <div className="flex justify-between items-center">
              <span className="text-base-dark/60">ROAD INUNDATION:</span>
              <span className={`font-bold ${activeSensor.roadSubmersionDepthM > 0 ? 'text-status-danger' : 'text-status-ok'}`}>
                {activeSensor.roadSubmersionDepthM > 0
                  ? `+${activeSensor.roadSubmersionDepthM.toFixed(2)}m SUBMERGED`
                  : 'CLEAR (PASSABLE)'}
              </span>
            </div>
            <div className="flex justify-between items-center text-base-dark/70 mt-1">
              <span>FLOW VELOCITY:</span>
              <span className="text-base-dark font-bold">{activeSensor.flowVelocityMps.toFixed(1)} m/s</span>
            </div>
          </div>

          {/* Correlated Corridors */}
          <div className="font-mono text-[7px] text-base-dark/60 px-1">
            <span className="text-base-dark font-bold">CROSSING ROADS: </span>
            <span className="text-base-dark">{activeSensor.correlatedEdgeIds?.join(', ') || 'Corridor'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
