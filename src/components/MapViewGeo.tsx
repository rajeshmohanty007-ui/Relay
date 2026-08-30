'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Node, Edge, Convoy } from '../lib/types';
import type { WaterSensor } from '../lib/waterSensors';
import type { MapLayer } from './MapViewTopo';
import { fetchRoadRoutesForEdges, type LatLng } from '../lib/osrmrouting';

export interface MapViewGeoProps {
    nodes: Node[];
    edges: Edge[];
    convoys: Convoy[];
    sensors?: WaterSensor[];
    visibleLayers?: Set<MapLayer>;
}

type BasemapStyle = 'street' | 'satellite';

const BASEMAPS: Record<BasemapStyle, { url: string; attribution: string; label: string }> = {
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        label: 'Streets',
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
        label: 'Satellite',
    },
};

const NODE_STYLE: Record<Node['type'], { color: string; radius: number }> = {
    depot: { color: '#1e293b', radius: 9 },
    shelter: { color: '#e11d48', radius: 8 },
    village: { color: '#10b981', radius: 6 },
    junction: { color: '#9ca3af', radius: 4 },
};

const EDGE_STYLE: Record<Edge['status'], { color: string; weight: number; dashArray?: string }> = {
    clear: { color: '#3b82f6', weight: 3 },
    degraded: { color: '#f59e0b', weight: 4, dashArray: '8 6' },
    blocked: { color: '#ef4444', weight: 4 },
};

const CONVOY_COLOR: Partial<Record<Convoy['status'], string>> = {
    enroute: '#22c55e',
    rerouted: '#f59e0b',
    recalled: '#ef4444',
};

function getShelterStatusColor(node: Node): string {
    if (!node.criticalSupplyNeed) return '#10b981';
    const hoursLeft = node.criticalSupplyNeed.hoursOfStockRemaining;
    if (hoursLeft <= 3.0) return '#ef4444';
    if (hoursLeft <= 5.0) return '#f59e0b';
    return '#10b981';
}

function nodeDivIcon(node: Node): L.DivIcon {
    const style = NODE_STYLE[node.type];
    const fill = node.type === 'shelter' ? getShelterStatusColor(node) : style.color;
    const size = style.radius * 2;
    const shape =
        node.type === 'depot'
            ? `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" fill="${fill}" stroke="#fff" stroke-width="1.5" />`
            : node.type === 'shelter'
                ? `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" fill="${fill}" stroke="#fff" stroke-width="1.5" transform="rotate(45 ${size / 2} ${size / 2})" />`
                : `<circle cx="${size / 2}" cy="${size / 2}" r="${style.radius - 1}" fill="${fill}" stroke="#fff" stroke-width="1.5" />`;
    return L.divIcon({
        className: 'relay-node-icon',
        html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${shape}</svg>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

function convoyDivIcon(color: string): L.DivIcon {
    return L.divIcon({
        className: 'relay-convoy-icon',
        html: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${color}" stroke="#fff" stroke-width="2" /></svg>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });
}

/** Total path length in the same units as the lat/lng coordinates (fine for short-distance interpolation). */
function pathLength(path: LatLng[]): number {
    let total = 0;
    for (let i = 1; i < path.length; i++) {
        const [lat1, lng1] = path[i - 1];
        const [lat2, lng2] = path[i];
        total += Math.hypot(lat2 - lat1, lng2 - lng1);
    }
    return total;
}

/** Interpolates a point along a polyline at fraction t (0-1), walking the path in the given direction. */
function interpolateAlongPath(path: LatLng[], t: number, reversed: boolean): LatLng {
    if (path.length === 0) return [0, 0];
    if (path.length === 1) return path[0];
    const ordered = reversed ? [...path].reverse() : path;
    const total = pathLength(ordered);
    if (total === 0) return ordered[0];

    const targetDist = Math.min(Math.max(t, 0), 1) * total;
    let covered = 0;
    for (let i = 1; i < ordered.length; i++) {
        const [lat1, lng1] = ordered[i - 1];
        const [lat2, lng2] = ordered[i];
        const segLen = Math.hypot(lat2 - lat1, lng2 - lng1);
        if (covered + segLen >= targetDist || i === ordered.length - 1) {
            const segT = segLen === 0 ? 0 : (targetDist - covered) / segLen;
            return [lat1 + (lat2 - lat1) * segT, lng1 + (lng2 - lng1) * segT];
        }
        covered += segLen;
    }
    return ordered[ordered.length - 1];
}

function FitBounds({ nodes }: { nodes: Node[] }) {
    const map = useMap();
    useEffect(() => {
        if (nodes.length === 0) return;
        const bounds = L.latLngBounds(nodes.map((n) => [n.lat, n.lng] as LatLng));
        map.fitBounds(bounds, { padding: [40, 40] });
    }, [nodes, map]);
    return null;
}

export default function MapViewGeo({
    nodes,
    edges,
    convoys,
    sensors = [],
    visibleLayers = new Set(['edges', 'nodes', 'convoys', 'sensors'] as MapLayer[]),
}: MapViewGeoProps) {
    const [basemap, setBasemap] = useState<BasemapStyle>('street');
    const [roadGeometry, setRoadGeometry] = useState<Map<string, LatLng[]>>(new Map());

    const nodesById = useMemo(() => {
        const map = new Map<string, Node>();
        for (const n of nodes) map.set(n.id, n);
        return map;
    }, [nodes]);

    const edgesById = useMemo(() => {
        const map = new Map<string, Edge>();
        for (const e of edges) map.set(e.id, e);
        return map;
    }, [edges]);

    // Straight-line geometry available instantly; upgraded to real road geometry once OSRM resolves.
    const straightGeometry = useMemo(() => {
        const map = new Map<string, LatLng[]>();
        for (const edge of edges) {
            const from = nodesById.get(edge.fromNodeId);
            const to = nodesById.get(edge.toNodeId);
            if (from && to) map.set(edge.id, [[from.lat, from.lng], [to.lat, to.lng]]);
        }
        return map;
    }, [edges, nodesById]);

    useEffect(() => {
        let cancelled = false;
        const requests = edges
            .map((edge) => {
                const from = nodesById.get(edge.fromNodeId);
                const to = nodesById.get(edge.toNodeId);
                if (!from || !to) return null;
                return { id: edge.id, from: [from.lat, from.lng] as LatLng, to: [to.lat, to.lng] as LatLng };
            })
            .filter((r): r is { id: string; from: LatLng; to: LatLng } => r !== null);

        fetchRoadRoutesForEdges(requests).then((resolved: Map<string, LatLng[]>) => {
            if (!cancelled) setRoadGeometry(resolved);
        });

        return () => {
            cancelled = true;
        };
    }, [edges, nodesById]);

    const geometryFor = (edgeId: string): LatLng[] => roadGeometry.get(edgeId) ?? straightGeometry.get(edgeId) ?? [];

    const initialCenter: LatLng =
        nodes.length > 0 ? [nodes[0].lat, nodes[0].lng] : [10.16, 76.38];

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={initialCenter}
                zoom={12}
                scrollWheelZoom
                className="h-full w-full rounded-lg"
                style={{ background: '#0f172a' }}
            >
                <TileLayer url={BASEMAPS[basemap].url} attribution={BASEMAPS[basemap].attribution} />
                <FitBounds nodes={nodes} />

                {(!visibleLayers || visibleLayers.has('edges')) &&
                    edges.map((edge) => {
                        const geom = geometryFor(edge.id);
                        if (geom.length < 2) return null;
                        const style = EDGE_STYLE[edge.status];
                        return (
                            <Polyline
                                key={edge.id}
                                positions={geom}
                                pathOptions={{ color: style.color, weight: style.weight, dashArray: style.dashArray, opacity: 0.85 }}
                            />
                        );
                    })}

                {(!visibleLayers || visibleLayers.has('nodes')) &&
                    nodes.map((node) => (
                        <Marker key={node.id} position={[node.lat, node.lng]} icon={nodeDivIcon(node)}>
                            <Popup>
                                <strong>{node.name}</strong>
                                <br />
                                {node.type}
                                {node.criticalSupplyNeed && (
                                    <>
                                        <br />
                                        Stock remaining: {node.criticalSupplyNeed.hoursOfStockRemaining}h
                                    </>
                                )}
                            </Popup>
                        </Marker>
                    ))}

                {(!visibleLayers || visibleLayers.has('convoys')) &&
                    convoys
                        .filter((c) => c.status !== 'arrived' && c.status !== 'pending' && c.currentEdgeId)
                        .map((convoy) => {
                            const edge = edgesById.get(convoy.currentEdgeId as string);
                            if (!edge) return null;
                            const geom = geometryFor(edge.id);
                            if (geom.length < 2) return null;

                            // Same reversed-traversal detection used by the tactical map, so
                            // convoys move the correct direction along bidirectional edges.
                            let isReversed = false;
                            const route = convoy.currentRoute || [];
                            const routeIdx = route.indexOf(convoy.currentEdgeId as string);
                            if (routeIdx >= 0 && routeIdx + 1 < route.length) {
                                const nextEdge = edgesById.get(route[routeIdx + 1]);
                                if (nextEdge && (edge.fromNodeId === nextEdge.fromNodeId || edge.fromNodeId === nextEdge.toNodeId)) {
                                    isReversed = true;
                                }
                            } else if (routeIdx >= 0 && routeIdx === route.length - 1) {
                                if (edge.fromNodeId === convoy.destNodeId) isReversed = true;
                            } else if (edge.toNodeId === convoy.originNodeId || edge.fromNodeId === convoy.destNodeId) {
                                isReversed = true;
                            }

                            const t = Math.min(Math.max(convoy.positionProgress, 0), 1);
                            const position = interpolateAlongPath(geom, t, isReversed);
                            const color = CONVOY_COLOR[convoy.status] ?? '#6b7280';

                            return (
                                <Marker key={convoy.id} position={position} icon={convoyDivIcon(color)}>
                                    <Popup>
                                        <strong>{convoy.id}</strong>
                                        <br />
                                        {convoy.cargoType} — {convoy.status}
                                    </Popup>
                                </Marker>
                            );
                        })}

                {(!visibleLayers || visibleLayers.has('sensors')) &&
                    sensors.map((sensor) => (
                        <CircleMarker
                            key={sensor.id}
                            center={[sensor.lat, sensor.lng]}
                            radius={5}
                            pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.9 }}
                        >
                            <Popup>
                                <strong>{sensor.name}</strong>
                                <br />
                                Level: {sensor.currentLevelM}m
                            </Popup>
                        </CircleMarker>
                    ))}
            </MapContainer>

            <div className="absolute top-3 right-3 z-[1000] flex overflow-hidden rounded-lg border border-white/20 shadow-lg">
                {(Object.keys(BASEMAPS) as BasemapStyle[]).map((style) => (
                    <button
                        key={style}
                        type="button"
                        onClick={() => setBasemap(style)}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${basemap === style ? 'bg-blue-600 text-white' : 'bg-white/90 text-slate-800 hover:bg-white'
                            }`}
                    >
                        {BASEMAPS[style].label}
                    </button>
                ))}
            </div>
        </div>
    );
}
