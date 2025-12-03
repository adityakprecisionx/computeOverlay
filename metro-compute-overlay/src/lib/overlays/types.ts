import type mapboxgl from 'mapbox-gl';

/**
 * Overlay ID type - extend this as new overlays are added
 */
export type OverlayId = 'latency' | 'power';

/**
 * Overlay definition interface
 * Each overlay must implement this to integrate with the map system
 */
export interface OverlayDefinition {
  id: OverlayId;
  label: string;
  description?: string;
  isEnabledByDefault?: boolean;
  registerLayers: (map: mapboxgl.Map) => void;
  unregisterLayers?: (map: mapboxgl.Map) => void;
  ControlsComponent?: React.ComponentType<{ overlayId: OverlayId }>;
}

/**
 * Overlay state interface
 */
export interface OverlayState {
  enabled: boolean;
  subLayers?: Record<string, boolean>; // For overlays with sub-layer toggles
}

