/**
 * Snaps a straight node-to-node edge onto real road geometry using OSRM's
 * free public routing API (no key required). Results are cached in memory
 * and in sessionStorage so repeated renders / demo replays don't re-fetch,
 * and any edge that fails to resolve (offline, rate-limited, no road match)
 * falls back to a straight line so the map never breaks.
 */

export type LatLng = [number, number]; // [lat, lng]

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';
const CACHE_KEY_PREFIX = 'relay_osrm_route_v1:';
const FETCH_TIMEOUT_MS = 6000;

const memoryCache = new Map<string, LatLng[]>();
const inFlight = new Map<string, Promise<LatLng[]>>();

function cacheKey(from: LatLng, to: LatLng): string {
    return `${from[0].toFixed(5)},${from[1].toFixed(5)}|${to[0].toFixed(5)},${to[1].toFixed(5)}`;
}

function readSessionCache(key: string): LatLng[] | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(CACHE_KEY_PREFIX + key);
        return raw ? (JSON.parse(raw) as LatLng[]) : null;
    } catch {
        return null;
    }
}

function writeSessionCache(key: string, coords: LatLng[]): void {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(coords));
    } catch {
        // sessionStorage full or unavailable — in-memory cache still covers this session
    }
}

/**
 * Fetches a real-road polyline between two points. Returns [from, to]
 * (a straight line) if OSRM is unreachable or returns no route, so callers
 * can always render *something* without extra error handling.
 */
export async function fetchRoadRoute(from: LatLng, to: LatLng): Promise<LatLng[]> {
    const key = cacheKey(from, to);

    const memHit = memoryCache.get(key);
    if (memHit) return memHit;

    const sessionHit = readSessionCache(key);
    if (sessionHit) {
        memoryCache.set(key, sessionHit);
        return sessionHit;
    }

    const pending = inFlight.get(key);
    if (pending) return pending;

    const request = (async (): Promise<LatLng[]> => {
        const straightLineFallback: LatLng[] = [from, to];
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

            const url = `${OSRM_BASE_URL}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!res.ok) return straightLineFallback;

            const data = await res.json();
            const geometry = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
            if (!geometry || geometry.length < 2) return straightLineFallback;

            // OSRM returns [lng, lat] pairs — flip to [lat, lng] for Leaflet.
            const coords: LatLng[] = geometry.map(([lng, lat]) => [lat, lng]);

            memoryCache.set(key, coords);
            writeSessionCache(key, coords);
            return coords;
        } catch {
            return straightLineFallback;
        } finally {
            inFlight.delete(key);
        }
    })();

    inFlight.set(key, request);
    return request;
}

/**
 * Resolves road geometry for many edges concurrently, with a small
 * concurrency cap so we don't fire 46 simultaneous requests at the free
 * OSRM demo server. Each result is keyed by the edge id passed in.
 */
export async function fetchRoadRoutesForEdges(
    edges: Array<{ id: string; from: LatLng; to: LatLng }>,
    concurrency = 6,
): Promise<Map<string, LatLng[]>> {
    const results = new Map<string, LatLng[]>();
    let cursor = 0;

    async function worker() {
        while (cursor < edges.length) {
            const idx = cursor++;
            const edge = edges[idx];
            const coords = await fetchRoadRoute(edge.from, edge.to);
            results.set(edge.id, coords);
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, edges.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

export async function fetchRoadRouteForPath(points: LatLng[]): Promise<LatLng[]> {
    if (points.length < 2) return points;
    if (points.length === 2) return fetchRoadRoute(points[0], points[1]);

    const pathCacheKey = (pts: LatLng[]) =>
        pts.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('|');

    const key = 'path:' + pathCacheKey(points);

    const memHit = memoryCache.get(key);
    if (memHit) return memHit;

    const sessionHit = readSessionCache(key);
    if (sessionHit) {
        memoryCache.set(key, sessionHit);
        return sessionHit;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const coordsString = points.map((p) => `${p[1]},${p[0]}`).join(';');
        const url = `${OSRM_BASE_URL}/${coordsString}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) return points;

        const data = await res.json();
        const geometry = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
        if (!geometry || geometry.length < 2) return points;

        const coords: LatLng[] = geometry.map(([lng, lat]) => [lat, lng]);

        memoryCache.set(key, coords);
        writeSessionCache(key, coords);
        return coords;
    } catch {
        return points;
    }
}
