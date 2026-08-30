/**
 * Persists a citizen's chosen route (origin + destination) in the browser's
 * own localStorage. This is deliberately NOT written to Firestore or any
 * shared store — localStorage is scoped to one browser/device, so one
 * person's planned route is never visible to anyone else using the app.
 */

const STORAGE_KEY = 'relay_citizen_route_v1';

export interface SavedCitizenRoute {
    originId: string;
    destId: string;
}

export function loadSavedCitizenRoute(): SavedCitizenRoute | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.originId === 'string' && typeof parsed?.destId === 'string') {
            return { originId: parsed.originId, destId: parsed.destId };
        }
        return null;
    } catch {
        return null;
    }
}

export function saveCitizenRoute(originId: string, destId: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ originId, destId }));
    } catch {
        // localStorage unavailable (private browsing / quota) — selection just won't persist across reloads
    }
}

export function clearSavedCitizenRoute(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}
