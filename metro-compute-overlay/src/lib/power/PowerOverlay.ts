/**
 * Power Overlay Implementation
 * 
 * Registers map layers for Texas power infrastructure:
 * - 138 kV and 345 kV transmission lines
 * - Transmission/bulk power substations
 * - Power plants (≥ 1 MW from EIA)
 */

import mapboxgl from 'mapbox-gl';
import { powerDataSources, TEXAS_BOUNDS, type SubstationProperties, type PowerPlantProperties } from './dataSource';

/**
 * Power overlay layer IDs
 */
const LAYER_IDS = {
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

/**
 * Register all power overlay layers on the map
 */
export function registerPowerLayers(map: mapboxgl.Map): void {
  if (!map.isStyleLoaded()) {
    // Wait for style to load
    map.once('style.load', () => registerPowerLayers(map));
    return;
  }

  // Add transmission lines source
  if (!map.getSource(SOURCE_IDS.transmission)) {
    map.addSource(SOURCE_IDS.transmission, {
      type: 'geojson',
      data: powerDataSources.transmission.path,
    });
  }

  // Add transmission lines layer
  if (!map.getLayer(LAYER_IDS.transmission)) {
    map.addLayer({
      id: LAYER_IDS.transmission,
      type: 'line',
      source: SOURCE_IDS.transmission,
      paint: {
        'line-color': '#4A90E2', // Neutral blue
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, ['case', ['==', ['get', 'voltage_kv'], 345], 1.5, 0.75],
          8, ['case', ['==', ['get', 'voltage_kv'], 345], 3, 1.5],
          11, ['case', ['==', ['get', 'voltage_kv'], 345], 5, 3],
        ],
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 0.4,
          8, 0.6,
          11, 0.8,
        ],
      },
      filter: ['in', ['get', 'voltage_kv'], ['literal', [138, 345]]],
    });
  }

  // Add substations source
  if (!map.getSource(SOURCE_IDS.substations)) {
    map.addSource(SOURCE_IDS.substations, {
      type: 'geojson',
      data: powerDataSources.substations.path,
    });
  }

  // Add substations layer
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
  }

  // Add power plants source
  if (!map.getSource(SOURCE_IDS.plants)) {
    map.addSource(SOURCE_IDS.plants, {
      type: 'geojson',
      data: powerDataSources.plants.path,
    });
  }

  // Add power plants layer
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
  }

  // Add click handlers for substations and plants
  setupClickHandlers(map);
}

/**
 * Unregister all power overlay layers from the map
 */
export function unregisterPowerLayers(map: mapboxgl.Map): void {
  // Remove layers
  [LAYER_IDS.transmission, LAYER_IDS.substations, LAYER_IDS.plants].forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  });

  // Remove sources
  [SOURCE_IDS.transmission, SOURCE_IDS.substations, SOURCE_IDS.plants].forEach(sourceId => {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  });
}

/**
 * Set visibility of power overlay sub-layers
 */
export function setPowerLayerVisibility(
  map: mapboxgl.Map,
  layerType: 'transmission' | 'substations' | 'plants',
  visible: boolean
): void {
  const layerId = LAYER_IDS[layerType];
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
}

/**
 * Setup click handlers for substations and plants to show popups
 */
function setupClickHandlers(map: mapboxgl.Map): void {
  // Create popup element
  const popup = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: true,
  });

  // Substation click handler
  map.on('click', LAYER_IDS.substations, (e) => {
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
  });

  // Plant click handler
  map.on('click', LAYER_IDS.plants, (e) => {
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
  });

  // Change cursor on hover
  map.on('mouseenter', LAYER_IDS.substations, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', LAYER_IDS.substations, () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('mouseenter', LAYER_IDS.plants, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', LAYER_IDS.plants, () => {
    map.getCanvas().style.cursor = '';
  });
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

