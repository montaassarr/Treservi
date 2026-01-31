/**
 * App State Manager - Handles saving and restoring app state
 * Similar to how Facebook handles deep linking and state restoration
 */

interface AppState {
  route: string;
  salonSlug?: string;
  params?: Record<string, string>;
  timestamp: number;
}

const STATE_KEY = 'treservi_app_state';
const STATE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Save current app state to localStorage
 */
export const saveAppState = (route: string, salonSlug?: string, params?: Record<string, string>) => {
  try {
    const state: AppState = {
      route,
      salonSlug,
      params,
      timestamp: Date.now(),
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save app state:', error);
  }
};

/**
 * Get saved app state from localStorage
 * Returns null if state is expired or doesn't exist
 */
export const getAppState = (): AppState | null => {
  try {
    const stored = localStorage.getItem(STATE_KEY);
    if (!stored) return null;

    const state: AppState = JSON.parse(stored);
    
    // Check if state is expired
    if (Date.now() - state.timestamp > STATE_EXPIRY) {
      clearAppState();
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to get app state:', error);
    return null;
  }
};

/**
 * Clear saved app state
 */
export const clearAppState = () => {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch (error) {
    console.error('Failed to clear app state:', error);
  }
};

/**
 * Restore app to previous state if available
 * Called on app initialization
 */
export const restoreAppState = (): { route: string; salonSlug?: string } | null => {
  const state = getAppState();
  if (!state) return null;

  return {
    route: state.route,
    salonSlug: state.salonSlug,
  };
};

/**
 * Save salon preference for quick access
 * (similar to Facebook remembering your last viewed profile)
 */
export const saveSalonPreference = (salonSlug: string) => {
  try {
    localStorage.setItem('lastSalonSlug', salonSlug);
  } catch (error) {
    console.error('Failed to save salon preference:', error);
  }
};

/**
 * Get last visited salon
 */
export const getLastSalonSlug = (): string | null => {
  try {
    return localStorage.getItem('lastSalonSlug');
  } catch (error) {
    console.error('Failed to get last salon slug:', error);
    return null;
  }
};

/**
 * Deep link parser - extracts route and params from URL
 * Example: /?salon=hamdi&ref=qr_code -> { route: '/book', salonSlug: 'hamdi', params: { ref: 'qr_code' } }
 */
export const parseDeepLink = (searchParams: URLSearchParams): { route: string; salonSlug?: string; params: Record<string, string> } => {
  const params: Record<string, string> = {};
  const salonSlug = searchParams.get('salon') || undefined;
  const ref = searchParams.get('ref') || undefined;
  const route = searchParams.get('route') || '/book';

  // Extract all params
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return {
    route,
    salonSlug,
    params: { ...params, ref } as Record<string, string>,
  };
};
