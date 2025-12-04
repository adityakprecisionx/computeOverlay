/**
 * Power Overlay Implementation
 * 
 * Registers map layers for Texas power infrastructure:
 * - 138 kV and 345 kV transmission lines
 * - Transmission/bulk power substations
 * - Power plants (≥ 1 MW from EIA)
 */

import mapboxgl from 'mapbox-gl';
import { powerDataSources, TEXAS_BOUNDS, type SubstationProperties, type PowerPlantProperties, type TransmissionLineProperties } from './dataSource';

/**
 * Power overlay layer IDs
 */
export const LAYER_IDS = {
  transmission: 'tx-transmission-lines',
  substations: 'tx-substations-layer',
  plants: 'tx-power-plants-layer',
} as const;

/**
 * Power overlay source IDs (must match dataSource.ts)
 */
const SOURCE_IDS = {
  transmission: powerDataSources.transmission.id,
  substations: powerDataSources.substations.id,
  plants: powerDataSources.plants.id,
} as const;

// Track if click handlers have been set up per map instance to avoid duplicates
const clickHandlersSetup = new WeakMap<mapboxgl.Map, boolean>();

/**
 * Register all power overlay layers on the map
 */
export function registerPowerLayers(map: mapboxgl.Map): void {
  if (!map.isStyleLoaded()) {
    // Wait for style to load
    map.once('style.load', () => registerPowerLayers(map));
    return;
  }

  // Add transmission lines source (re-add if it was removed)
  if (!map.getSource(SOURCE_IDS.transmission)) {
    map.addSource(SOURCE_IDS.transmission, {
      type: 'geojson',
      data: powerDataSources.transmission.path,
    });
  }

  // Add transmission lines layer with full voltage-based color scheme
  // Color scheme based on HIFLD/ArcGIS standard:
  // Under 100 kV: Gold, 100-160 kV: Orange, 220-287 kV: OrangeRed, 345 kV: Red, 500 kV: DarkBlue, 735+ kV: BlueViolet, Other: Gray
  if (!map.getLayer(LAYER_IDS.transmission)) {
    map.addLayer({
      id: LAYER_IDS.transmission,
      type: 'line',
      source: SOURCE_IDS.transmission,
      paint: {
        'line-color': [
          'case',
          // 735+ kV: BlueViolet
          ['>=', ['get', 'voltage_kv'], 735],
          '#8A2BE2',
          // 500 kV: DarkBlue
          ['==', ['get', 'voltage_kv'], 500],
          '#00008B',
          // 345 kV: Red
          ['==', ['get', 'voltage_kv'], 345],
          '#CC0000',
          // 220-287 kV: OrangeRed
          ['all', ['>=', ['get', 'voltage_kv'], 220], ['<=', ['get', 'voltage_kv'], 287]],
          '#FF4500',
          // 100-160 kV: Orange
          ['all', ['>=', ['get', 'voltage_kv'], 100], ['<=', ['get', 'voltage_kv'], 160]],
          '#FFA500',
          // Under 100 kV: Gold
          ['<', ['get', 'voltage_kv'], 100],
          '#FFD700',
          // Other: Gray
          '#808080'
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, [
            'case',
            ['>=', ['get', 'voltage_kv'], 500], 2,
            ['>=', ['get', 'voltage_kv'], 345], 1.5,
            ['>=', ['get', 'voltage_kv'], 220], 1.25,
            ['>=', ['get', 'voltage_kv'], 100], 1,
            0.75
          ],
          8, [
            'case',
            ['>=', ['get', 'voltage_kv'], 500], 4,
            ['>=', ['get', 'voltage_kv'], 345], 3,
            ['>=', ['get', 'voltage_kv'], 220], 2.5,
            ['>=', ['get', 'voltage_kv'], 100], 2,
            1.5
          ],
          11, [
            'case',
            ['>=', ['get', 'voltage_kv'], 500], 6,
            ['>=', ['get', 'voltage_kv'], 345], 5,
            ['>=', ['get', 'voltage_kv'], 220], 4,
            ['>=', ['get', 'voltage_kv'], 100], 3,
            2.5
          ],
        ],
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 0.5,
          8, 0.7,
          11, 0.9,
        ],
      },
      // No filter - show all voltage levels
    });
    // Ensure layer stays visible during map movements
    map.setLayoutProperty(LAYER_IDS.transmission, 'visibility', 'visible');
  } else {
    // Ensure layer is visible if it already exists (only if not explicitly hidden)
    const currentVisibility = map.getLayoutProperty(LAYER_IDS.transmission, 'visibility');
    if (currentVisibility !== 'none') {
      map.setLayoutProperty(LAYER_IDS.transmission, 'visibility', 'visible');
    }
  }

  // Add substations source (re-add if it was removed)
  if (!map.getSource(SOURCE_IDS.substations)) {
    map.addSource(SOURCE_IDS.substations, {
      type: 'geojson',
      data: powerDataSources.substations.path,
    });
  }

  // Add substations layer (re-add if it was removed)
  if (!map.getLayer(LAYER_IDS.substations)) {
    map.addLayer({
      id: LAYER_IDS.substations,
      type: 'circle',
      source: SOURCE_IDS.substations,
      paint: {
        'circle-color': '#7B68EE', // Distinct purple
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 2,
          10, 4,
          14, 6,
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': 0.8,
      },
    });
  } else {
    map.setLayoutProperty(LAYER_IDS.substations, 'visibility', 'visible');
  }

  // Add power plants source (re-add if it was removed)
  if (!map.getSource(SOURCE_IDS.plants)) {
    map.addSource(SOURCE_IDS.plants, {
      type: 'geojson',
      data: powerDataSources.plants.path,
    });
  }

  // Add power plants layer (re-add if it was removed)
  if (!map.getLayer(LAYER_IDS.plants)) {
    map.addLayer({
      id: LAYER_IDS.plants,
      type: 'circle',
      source: SOURCE_IDS.plants,
      paint: {
        'circle-color': '#FF6B6B', // Distinct red
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['sqrt', ['max', ['get', 'capacity_mw'], 1]],
          1, 3,
          10, 8,
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': 0.85,
      },
      filter: ['>=', ['get', 'capacity_mw'], 1], // Only show plants ≥ 1 MW
    });
  } else {
    map.setLayoutProperty(LAYER_IDS.plants, 'visibility', 'visible');
  }

  // Always re-setup click handlers to ensure they work (they'll be deduplicated in setupClickHandlers)
  setupClickHandlers(map);
  clickHandlersSetup.set(map, true);
}

/**
 * Unregister all power overlay layers from the map
 */
export function unregisterPowerLayers(map: mapboxgl.Map): void {
  // Only hide layers, don't remove them (so they persist when overlay is toggled)
  [LAYER_IDS.transmission, LAYER_IDS.substations, LAYER_IDS.plants].forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', 'none');
    }
  });
  
  // Don't reset click handlers - they should persist
}

/**
 * Set visibility of power overlay sub-layers
 */
export function setPowerLayerVisibility(
  map: mapboxgl.Map,
  layerType: 'transmission' | 'substations' | 'plants',
  visible: boolean
): void {
  if (!map.isStyleLoaded()) {
    // Wait for style to load
    map.once('style.load', () => setPowerLayerVisibility(map, layerType, visible));
    return;
  }

  const layerId = LAYER_IDS[layerType];
  // Ensure layer exists before trying to set visibility
  if (!map.getLayer(layerId)) {
    // Layer doesn't exist, register it first
    registerPowerLayers(map);
  }
  // Now set visibility - double-check layer still exists after registration
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  } else {
    // If layer still doesn't exist after registration, try again after a short delay
    console.warn(`Power layer ${layerId} not found, retrying...`);
    setTimeout(() => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    }, 100);
  }
}

/**
 * Setup click handlers for transmission lines, substations, and plants to show popups
 */
// Store popup instance per map to avoid creating multiple popups
const popupInstances = new WeakMap<mapboxgl.Map, mapboxgl.Popup>();

// Store handlers per map so we can remove them properly
const handlerStorage = new WeakMap<mapboxgl.Map, {
  transmissionClick?: (e: mapboxgl.MapMouseEvent) => void;
  substationClick?: (e: mapboxgl.MapMouseEvent) => void;
  plantClick?: (e: mapboxgl.MapMouseEvent) => void;
  transmissionEnter?: () => void;
  transmissionLeave?: () => void;
  substationEnter?: () => void;
  substationLeave?: () => void;
  plantEnter?: () => void;
  plantLeave?: () => void;
}>();

function setupClickHandlers(map: mapboxgl.Map): void {
  // Get existing handlers and remove them if they exist
  const existingHandlers = handlerStorage.get(map);
  if (existingHandlers) {
    if (existingHandlers.transmissionClick) {
      map.off('click', LAYER_IDS.transmission, existingHandlers.transmissionClick);
    }
    if (existingHandlers.substationClick) {
      map.off('click', LAYER_IDS.substations, existingHandlers.substationClick);
    }
    if (existingHandlers.plantClick) {
      map.off('click', LAYER_IDS.plants, existingHandlers.plantClick);
    }
    if (existingHandlers.transmissionEnter) {
      map.off('mouseenter', LAYER_IDS.transmission, existingHandlers.transmissionEnter);
    }
    if (existingHandlers.transmissionLeave) {
      map.off('mouseleave', LAYER_IDS.transmission, existingHandlers.transmissionLeave);
    }
    if (existingHandlers.substationEnter) {
      map.off('mouseenter', LAYER_IDS.substations, existingHandlers.substationEnter);
    }
    if (existingHandlers.substationLeave) {
      map.off('mouseleave', LAYER_IDS.substations, existingHandlers.substationLeave);
    }
    if (existingHandlers.plantEnter) {
      map.off('mouseenter', LAYER_IDS.plants, existingHandlers.plantEnter);
    }
    if (existingHandlers.plantLeave) {
      map.off('mouseleave', LAYER_IDS.plants, existingHandlers.plantLeave);
    }
  }

  // Get or create popup element for this map instance
  let popup = popupInstances.get(map);
  if (!popup) {
    popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '400px',
    });
    popupInstances.set(map, popup);
  }

  // Create new handlers and store them
  const handlers: typeof existingHandlers = {};

  // Transmission line click handler
  handlers.transmissionClick = (e: mapboxgl.MapMouseEvent) => {
    if (!e.features || e.features.length === 0) {
      return;
    }
    
    const props = e.features[0].properties as TransmissionLineProperties;
    // Get coordinates from the clicked point
    const coordinates = e.lngLat.toArray() as [number, number];
    
    const content = `
      <div style="padding: 12px; min-width: 300px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="font-weight: 700; font-size: 16px; margin-bottom: 12px; color: #1a1a1a; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px;">
          Transmission Line Details
        </div>
        <div style="font-size: 13px; line-height: 1.6; color: #333;">
          <div style="margin-bottom: 8px;">
            <strong>Voltage:</strong> ${props.voltage_kv || props.voltage || 'Not Available'} (Kilovolts)
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Transmission Line ID:</strong> ${props.transmission_line_id || props.id || 'Not Available'}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Owner:</strong> ${props.owner || 'Not Available'}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Status:</strong> ${props.status || 'Not Available'}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Type of Transmission Line:</strong> ${props.type || 'Not Available'}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Inferred:</strong> ${props.inferred || 'No'}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Substation 1:</strong> ${props.substation_1 || 'Not Available'}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Substation 2:</strong> ${props.substation_2 || 'Not Available'}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>North American Industry Classification System (NAICS) Code:</strong> ${props.naics_code || 'Not Available'}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>North American Industry Classification System (NAICS) Description:</strong> ${props.naics_desc || 'Not Available'}
          </div>
        </div>
      </div>
    `;
    
    popup.setLngLat(coordinates).setHTML(content).addTo(map);
  };
  map.on('click', LAYER_IDS.transmission, handlers.transmissionClick);

  // Change cursor on hover for transmission lines
  handlers.transmissionEnter = () => {
    map.getCanvas().style.cursor = 'pointer';
  };
  handlers.transmissionLeave = () => {
    map.getCanvas().style.cursor = '';
  };
  map.on('mouseenter', LAYER_IDS.transmission, handlers.transmissionEnter);
  map.on('mouseleave', LAYER_IDS.transmission, handlers.transmissionLeave);

  // Substation click handler
  handlers.substationClick = (e: mapboxgl.MapMouseEvent) => {
    if (!e.features || e.features.length === 0) return;
    
    const props = e.features[0].properties as SubstationProperties;
    const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number];
    
    const content = `
      <div style="padding: 8px; min-width: 200px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: #7B68EE;">${props.name || 'Substation'}</div>
        ${props.type ? `<div style="font-size: 12px; color: #666;">Type: ${props.type}</div>` : ''}
        ${props.voltage_kv ? `<div style="font-size: 12px; color: #666;">Voltage: ${props.voltage_kv} kV</div>` : ''}
        ${props.owner ? `<div style="font-size: 12px; color: #666;">Owner: ${props.owner}</div>` : ''}
        ${props.ercot_zone ? `<div style="font-size: 12px; color: #666;">ERCOT Zone: ${props.ercot_zone}</div>` : ''}
        <div style="font-size: 11px; color: #999; margin-top: 8px;">ID: ${props.id}</div>
      </div>
    `;
    
    popup.setLngLat(coordinates).setHTML(content).addTo(map);
  };
  map.on('click', LAYER_IDS.substations, handlers.substationClick);

  // Change cursor on hover for substations
  handlers.substationEnter = () => {
    map.getCanvas().style.cursor = 'pointer';
  };
  handlers.substationLeave = () => {
    map.getCanvas().style.cursor = '';
  };
  map.on('mouseenter', LAYER_IDS.substations, handlers.substationEnter);
  map.on('mouseleave', LAYER_IDS.substations, handlers.substationLeave);

  // Plant click handler
  handlers.plantClick = (e: mapboxgl.MapMouseEvent) => {
    if (!e.features || e.features.length === 0) return;
    
    const props = e.features[0].properties as PowerPlantProperties;
    const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number];
    
    const content = `
      <div style="padding: 8px; min-width: 200px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: #FF6B6B;">${props.name}</div>
        <div style="font-size: 12px; color: #666;">Capacity: ${props.capacity_mw.toLocaleString()} MW</div>
        ${props.fuel_primary ? `<div style="font-size: 12px; color: #666;">Fuel: ${props.fuel_primary}</div>` : ''}
        ${props.status ? `<div style="font-size: 12px; color: #666;">Status: ${props.status}</div>` : ''}
        ${props.ercot_zone ? `<div style="font-size: 12px; color: #666;">ERCOT Zone: ${props.ercot_zone}</div>` : ''}
        <div style="font-size: 11px; color: #999; margin-top: 8px;">ID: ${props.plant_id}</div>
      </div>
    `;
    
    popup.setLngLat(coordinates).setHTML(content).addTo(map);
  };
  map.on('click', LAYER_IDS.plants, handlers.plantClick);

  // Change cursor on hover for plants
  handlers.plantEnter = () => {
    map.getCanvas().style.cursor = 'pointer';
  };
  handlers.plantLeave = () => {
    map.getCanvas().style.cursor = '';
  };
  map.on('mouseenter', LAYER_IDS.plants, handlers.plantEnter);
  map.on('mouseleave', LAYER_IDS.plants, handlers.plantLeave);

  // Store handlers for future removal
  handlerStorage.set(map, handlers);
}

/**
 * Optional: Fit map bounds to Texas when power overlay is first enabled
 */
export function fitToTexasBounds(map: mapboxgl.Map): void {
  map.fitBounds(TEXAS_BOUNDS, {
    padding: { top: 50, bottom: 50, left: 50, right: 50 },
    duration: 1500,
  });
}

