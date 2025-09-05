import type { AppState, NodeType, VacancyLevel } from './types';

/**
 * Encode application state to URL parameters
 * @param state Application state
 * @returns URL search params string
 */
export function encodeStateToUrl(state: AppState): string {
  const params = new URLSearchParams();
  
  // Selected nodes
  if (state.selectedNodes.length > 0) {
    params.set('nodes', state.selectedNodes.join(','));
  }
  
  // Point of use
  if (state.pointOfUse) {
    params.set('lat', state.pointOfUse.lat.toString());
    params.set('lon', state.pointOfUse.lon.toString());
    params.set('address', encodeURIComponent(state.pointOfUse.address));
  }
  
  // Selected workload
  if (state.selectedWorkload) {
    params.set('workload', state.selectedWorkload);
  }
  
  // Filters
  if (state.filters.type.length > 0) {
    params.set('type', state.filters.type.join(','));
  }
  if (state.filters.operator.length > 0) {
    params.set('operator', state.filters.operator.join(','));
  }
  if (state.filters.vacancy.length > 0) {
    params.set('vacancy', state.filters.vacancy.join(','));
  }
  
  // User GridSites
  if (state.userGridSites.length > 0) {
    params.set('gridsites', JSON.stringify(state.userGridSites));
  }
  
  // Compare mode
  if (state.compareMode) {
    params.set('compare', 'true');
  }
  
  // Latency ring mode
  if (state.latencyRingMode.enabled) {
    params.set('latencyRing', 'true');
    params.set('latencyThreshold', state.latencyRingMode.threshold.toString());
    params.set('radiusMultiplier', state.latencyRingMode.radiusMultiplier.toString());
  }
  
  return params.toString();
}

/**
 * Decode URL parameters to application state
 * @param searchParams URL search params
 * @returns Partial application state
 */
export function decodeStateFromUrl(searchParams: URLSearchParams): Partial<AppState> {
  const state: Partial<AppState> = {};
  
  // Selected nodes
  const nodes = searchParams.get('nodes');
  if (nodes) {
    state.selectedNodes = nodes.split(',');
  }
  
  // Point of use
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const address = searchParams.get('address');
  if (lat && lon && address) {
    state.pointOfUse = {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      address: decodeURIComponent(address)
    };
  }
  
  // Selected workload
  const workload = searchParams.get('workload');
  if (workload) {
    state.selectedWorkload = workload;
  }
  
  // Filters
  const filters: AppState['filters'] = {
    type: [],
    operator: [],
    vacancy: []
  };
  
  const type = searchParams.get('type');
  if (type) {
    filters.type = type.split(',') as NodeType[];
  }
  
  const operator = searchParams.get('operator');
  if (operator) {
    filters.operator = operator.split(',');
  }
  
  const vacancy = searchParams.get('vacancy');
  if (vacancy) {
    filters.vacancy = vacancy.split(',') as VacancyLevel[];
  }
  
  state.filters = filters;
  
  // User GridSites
  const gridsites = searchParams.get('gridsites');
  if (gridsites) {
    try {
      state.userGridSites = JSON.parse(gridsites);
    } catch (e) {
      console.warn('Failed to parse GridSites from URL:', e);
    }
  }
  
  // Compare mode
  const compare = searchParams.get('compare');
  if (compare === 'true') {
    state.compareMode = true;
  }
  
  // Latency ring mode
  const latencyRing = searchParams.get('latencyRing');
  const latencyThreshold = searchParams.get('latencyThreshold');
  const radiusMultiplier = searchParams.get('radiusMultiplier');
  if (latencyRing === 'true' && latencyThreshold) {
    state.latencyRingMode = {
      enabled: true,
      threshold: parseFloat(latencyThreshold),
      radiusMultiplier: radiusMultiplier ? (parseInt(radiusMultiplier) as 1 | 2) : 1
    };
  }
  
  return state;
}

/**
 * Get shareable URL with current state
 * @param state Application state
 * @returns Shareable URL
 */
export function getShareableUrl(state: AppState): string {
  const params = encodeStateToUrl(state);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  return params ? `${baseUrl}?${params}` : baseUrl;
}

/**
 * Copy current state URL to clipboard
 * @param state Application state
 */
export async function copyShareableUrl(state: AppState): Promise<void> {
  const url = getShareableUrl(state);
  
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(url);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}
