






const STORAGE_KEY = 'relay_citizen_route_v1';

export interface SavedCitizenRoute {
    originId: string;
    destId: string;
}

export function loadSavedCitizenRoute(): SavedCitizenRoute | null {
    if (typeof window === 'undefined') return null;
    try {
        window.localStorage.removeItem(STORAGE_KEY);
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
        
    }
}

export function clearSavedCitizenRoute(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        
    }
}
