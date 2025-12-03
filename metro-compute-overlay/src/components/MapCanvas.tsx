'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { useAppStore } from '@/lib/store';
import { MAPBOX_CONFIG } from '@/lib/constants';
import { createLatencyRadiusFeatures, createLatencyRingFeatures } from '@/lib/latency-radius';
import LatencyRingToggle from './LatencyRingToggle';
import PowerOverlayControls from './PowerOverlayControls';
import { registerPowerLayers, unregisterPowerLayers, setPowerLayerVisibility, fitToTexasBounds } from '@/lib/power/PowerOverlay';

import type { Node } from '@/lib/types';

// Set Mapbox access token
mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

interface MapCanvasProps {
  onNodeClick?: (node: Node) => void;
  onMapClick?: (lat: number, lon: number) => void;
  isPlacingGridSite?: boolean;
  isPlacingPointOfUse?: boolean;
  isDeleteMode?: boolean;
  isDrawingMode?: boolean;
  drawnPolygon?: [number, number][] | null;
  setDrawnPolygon?: (polygon: [number, number][] | null) => void;
}

export default function MapCanvas({ onNodeClick, onMapClick, isPlacingGridSite, isPlacingPointOfUse, isDeleteMode, isDrawingMode, drawnPolygon, setDrawnPolygon }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [forceNodeReload, setForceNodeReload] = useState(0);
  const [, setCurrentPolygon] = useState<[number, number][]>([]);
  const [cursorPosition, setCursorPosition] = useState<[number, number] | null>(null);
  
  const {
    nodes,
    selectedNodes,
    pointOfUse,
    userGridSites,
    mapState,
    setMapState,
    toggleNodeSelection,
    latencyRingMode,
    powerOverlay,
    getFilteredNodes
  } = useAppStore();
  
  // Create a callback that always has access to the current delete mode state
  const handleNodeClickCallback = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (e.features && e.features[0]) {
      const nodeId = e.features[0].properties?.id;
      if (nodeId) {
        if (onNodeClick) {
          // Search in both original nodes and user-created gridsites
          const allNodes = [...nodes, ...userGridSites];
          const node = allNodes.find(n => n.id === nodeId);
          if (node) onNodeClick(node);
        }
        
        // Only toggle selection (which triggers latency rings) if not in delete mode
        if (!isDeleteMode) {
          toggleNodeSelection(nodeId);
        }
      }
    }
  }, [onNodeClick, nodes, userGridSites, isDeleteMode, toggleNodeSelection]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_CONFIG.style,
      center: mapState.center,
      zoom: mapState.zoom,
      minZoom: MAPBOX_CONFIG.minZoom,
      maxZoom: MAPBOX_CONFIG.maxZoom
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Add zoom and rotation controls to the map (positioned to avoid blocking custom buttons)
      if (map.current) {
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');
      }
    });

    // Listen for style changes that might clear our layers
    map.current.on('styledata', () => {
      setForceNodeReload(prev => prev + 1);
    });

    // Listen for when the map is idle (finished loading/rendering)
    map.current.on('idle', () => {
      setForceNodeReload(prev => prev + 1);
    });

    map.current.on('moveend', () => {
      if (map.current) {
        setMapState({
          center: map.current.getCenter().toArray() as [number, number],
          zoom: map.current.getZoom(),
          bearing: map.current.getBearing(),
          pitch: map.current.getPitch()
        });
        setForceNodeReload(prev => prev + 1);
      }
    });

    // Add drag event listeners to force node reload
    map.current.on('dragstart', () => {
      setForceNodeReload(prev => prev + 1);
    });

    map.current.on('dragend', () => {
      setForceNodeReload(prev => prev + 1);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapState.center, mapState.zoom, setMapState]);

  // Handle map state changes (e.g., from location search)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentCenter = map.current.getCenter().toArray() as [number, number];
    const currentZoom = map.current.getZoom();
    
    // Check if we need to fly to a new location
    const centerChanged = 
      Math.abs(currentCenter[0] - mapState.center[0]) > 0.001 ||
      Math.abs(currentCenter[1] - mapState.center[1]) > 0.001;
    const zoomChanged = Math.abs(currentZoom - mapState.zoom) > 0.1;

    if (centerChanged || zoomChanged) {
      map.current.flyTo({
        center: mapState.center,
        zoom: mapState.zoom,
        bearing: mapState.bearing,
        pitch: mapState.pitch,
        duration: 2000, // 2 second animation
        essential: true
      });
    }
  }, [mapState, mapLoaded]);

  // Add click handler for setting point of use or GridSite
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (onMapClick && (isPlacingGridSite || isPlacingPointOfUse)) {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      }
    };

    map.current.on('click', handleClick);

    return () => {
      if (map.current) {
        map.current.off('click', handleClick);
      }
    };
  }, [mapLoaded, onMapClick, isPlacingGridSite, isPlacingPointOfUse]);

  // Update cursor based on placement mode
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const canvas = map.current.getCanvas();
    if (canvas) {
      canvas.style.cursor = (isPlacingGridSite || isPlacingPointOfUse) ? 'crosshair' : '';
    }
  }, [mapLoaded, isPlacingGridSite, isPlacingPointOfUse]);

  // Add nodes to map
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    if (!map.current.isStyleLoaded()) return;

    // Get filtered nodes that have coordinates
    const filteredNodes = getFilteredNodes();
    const onMapNodes = filteredNodes.filter(node => node.lat !== undefined && node.lon !== undefined);
    const allNodes = [...onMapNodes, ...userGridSites];
    
    // When in delete mode, only show gridsite nodes
    const nodesToShow = isDeleteMode 
      ? allNodes.filter(node => node.type === 'gridsite')
      : allNodes;

    // Get selected nodes for latency radius visualization
    const selectedOnMapNodes = nodesToShow
      .filter(node => selectedNodes.includes(node.id))
      .filter(node => node.lat !== undefined && node.lon !== undefined)
      .map(node => ({
        lat: node.lat!,
        lon: node.lon!,
        id: node.id,
        name: node.name
      }));

    const nodeSource = map.current.getSource('nodes') as mapboxgl.GeoJSONSource;
    
    if (nodeSource) {
      nodeSource.setData({
        type: 'FeatureCollection',
        features: nodesToShow.map(node => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [node.lon!, node.lat!]
          },
          properties: {
            id: node.id,
            name: node.name,
            type: node.type,
            operator: node.operator,
            vacancy: node.vacancy,
            selected: selectedNodes.includes(node.id)
          }
        }))
      });
    } else {
      map.current.addSource('nodes', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: nodesToShow.map(node => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [node.lon!, node.lat!]
            },
            properties: {
              id: node.id,
              name: node.name,
              type: node.type,
              operator: node.operator,
              vacancy: node.vacancy,
              selected: selectedNodes.includes(node.id)
            }
          }))
        }
      });
    }

    // Handle latency radius visualization
    const latencyRadiusSource = map.current.getSource('latency-radius') as mapboxgl.GeoJSONSource;
    
    // Always ensure the latency radius source exists
    if (!latencyRadiusSource) {
      map.current.addSource('latency-radius', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
    }
    
    // Update the source data based on latency ring mode
    const updatedLatencyRadiusSource = map.current.getSource('latency-radius') as mapboxgl.GeoJSONSource;
    if (latencyRingMode.enabled) {
      // Show latency rings for all nodes at the specified threshold
      const nodesWithCoords = allNodes
        .filter(node => node.lat !== undefined && node.lon !== undefined)
        .map(node => ({ lat: node.lat!, lon: node.lon!, id: node.id, name: node.name }));
      const latencyRingFeatures = createLatencyRingFeatures(nodesWithCoords, latencyRingMode.threshold, latencyRingMode.radiusMultiplier);
      updatedLatencyRadiusSource.setData(latencyRingFeatures);
    } else if (selectedOnMapNodes.length > 0) {
      // Show latency radius for selected nodes (original behavior)
      const latencyRadiusFeatures = createLatencyRadiusFeatures(selectedOnMapNodes);
      updatedLatencyRadiusSource.setData(latencyRadiusFeatures);
    } else {
      updatedLatencyRadiusSource.setData({
        type: 'FeatureCollection',
        features: []
      });
    }

    // Add layers only if they don't exist
    if (!map.current.getLayer('nodes-circle')) {
      // Add node circles
      map.current.addLayer({
        id: 'nodes-circle',
        type: 'circle',
        source: 'nodes',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['get', 'selected'], false], 12, 8
          ],
          'circle-color': [
            'match',
            ['get', 'type'],
            'colo', '#3b82f6',
            'cloud', '#10b981',
            'gridsite', '#8b5cf6',
            '#6b7280'
          ],
          'circle-stroke-color': [
            'case',
            ['boolean', ['get', 'selected'], false], '#1f2937', '#ffffff'
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['get', 'selected'], false], 3, 2
          ]
        }
      });

      // Add node labels
      map.current.addLayer({
        id: 'nodes-symbol',
        type: 'symbol',
        source: 'nodes',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': 12,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1
        }
      });

      // Add click handler for nodes
      map.current.on('click', 'nodes-circle', handleNodeClickCallback);

      // Change cursor on hover
      map.current.on('mouseenter', 'nodes-circle', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'nodes-circle', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = (isPlacingGridSite || isPlacingPointOfUse) ? 'crosshair' : '';
        }
      });
    }

    // Control layer visibility based on latency ring mode
    if (map.current.getLayer('nodes-circle')) {
      if (latencyRingMode.enabled) {
        // Hide node circles when showing latency rings
        map.current.setLayoutProperty('nodes-circle', 'visibility', 'none');
        map.current.setLayoutProperty('nodes-symbol', 'visibility', 'none');
      } else {
        // Show node circles when not in latency ring mode
        map.current.setLayoutProperty('nodes-circle', 'visibility', 'visible');
        map.current.setLayoutProperty('nodes-symbol', 'visibility', 'visible');
      }
    }

    // Add latency radius layers if they don't exist
    if (!map.current.getLayer('latency-radius-fill')) {
      // Add latency radius fill layer
      map.current.addLayer({
        id: 'latency-radius-fill',
        type: 'fill',
        source: 'latency-radius',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.1,
          'fill-outline-color': ['get', 'color']
        },
        filter: ['has', 'rtt']
      });

      // Add latency radius outline layer
      map.current.addLayer({
        id: 'latency-radius-outline',
        type: 'line',
        source: 'latency-radius',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1,
          'line-opacity': 0.6
        },
        filter: ['has', 'rtt']
      });
    }
  }, [
    nodes, 
    selectedNodes, 
    userGridSites, 
    mapLoaded, 
    handleNodeClickCallback,
    isPlacingGridSite, 
    isPlacingPointOfUse,
    isDeleteMode,
    forceNodeReload,
    latencyRingMode,
    getFilteredNodes
  ]);

  // Add point of use marker
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing marker
    const existingMarker = document.getElementById('point-of-use-marker');
    if (existingMarker) {
      existingMarker.remove();
    }

    // Remove any existing mapbox markers
    const existingMapboxMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMapboxMarkers.forEach(marker => {
      if (marker.id === 'point-of-use-marker-container') {
        marker.remove();
      }
    });

    if (pointOfUse) {
      const marker = new mapboxgl.Marker({
        element: createPointOfUseMarker(),
        color: '#ef4444'
      })
        .setLngLat([pointOfUse.lon, pointOfUse.lat])
        .addTo(map.current);
      
      // Give the marker container an ID for easier removal
      const markerElement = marker.getElement();
      if (markerElement) {
        markerElement.id = 'point-of-use-marker-container';
      }
    }
  }, [pointOfUse, mapLoaded, forceNodeReload]);

  // Handle power overlay
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (!map.current.isStyleLoaded()) return;

    if (powerOverlay.enabled) {
      // Register power layers
      registerPowerLayers(map.current);
      
      // Set sub-layer visibility
      setPowerLayerVisibility(map.current, 'transmission', powerOverlay.subLayers.transmission);
      setPowerLayerVisibility(map.current, 'substations', powerOverlay.subLayers.substations);
      setPowerLayerVisibility(map.current, 'plants', powerOverlay.subLayers.plants);

      // Optional: Fit to Texas bounds if map is zoomed out too far
      const currentZoom = map.current.getZoom();
      if (currentZoom < 6) {
        fitToTexasBounds(map.current);
      }
    } else {
      // Unregister power layers when disabled
      unregisterPowerLayers(map.current);
    }
  }, [mapLoaded, powerOverlay]);

  // Handle drawing mode
  useEffect(() => {
    if (!map.current || !mapLoaded || !isDrawingMode) return;

    let mousePosition: [number, number] | null = null;

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      // Track mouse position for drawing
      mousePosition = [e.lngLat.lng, e.lngLat.lat];
      setCursorPosition(mousePosition);
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isDrawingMode || !setDrawnPolygon) return;

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        
        // Use mouse position if available, otherwise fall back to map center
        let newPoint: [number, number];
        if (mousePosition) {
          newPoint = mousePosition;
          console.log('Drawing mode: Adding point at mouse position', newPoint);
        } else if (map.current) {
          const center = map.current.getCenter();
          newPoint = [center.lng, center.lat];
          console.log('Drawing mode: Adding point at map center (no mouse position)', newPoint);
        } else {
          console.log('Drawing mode: No map or mouse position available');
          return;
        }
        
        setCurrentPolygon(prev => {
          const newPolygon = [...prev, newPoint];
          console.log('New polygon points:', newPolygon);
          // Use setTimeout to avoid setState during render
          setTimeout(() => setDrawnPolygon(newPolygon), 0);
          return newPolygon;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        console.log('Enter: Completing polygon');
        
        // Complete the polygon on Enter if we have at least 3 points
        setCurrentPolygon(prev => {
          if (prev.length >= 3) {
            console.log('Completing polygon with points:', prev);
            // Use setTimeout to avoid setState during render
            setTimeout(() => setDrawnPolygon(prev), 0);
          }
          return prev;
        });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        console.log('Escape: Canceling drawing');
        setCurrentPolygon([]);
        if (setDrawnPolygon) setDrawnPolygon(null);
      }
    };

    // Add mouse move listener to track cursor position
    map.current.on('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      if (map.current) {
        map.current.off('mousemove', handleMouseMove);
      }
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [mapLoaded, isDrawingMode, setDrawnPolygon]);

  // Update polygon visualization
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing polygon layers and sources
    if (map.current.getLayer('drawn-polygon-outline')) {
      map.current.removeLayer('drawn-polygon-outline');
    }
    if (map.current.getLayer('drawn-polygon')) {
      map.current.removeLayer('drawn-polygon');
    }
    if (map.current.getLayer('drawn-polygon-points')) {
      map.current.removeLayer('drawn-polygon-points');
    }
    if (map.current.getLayer('drawn-polygon-cursor')) {
      map.current.removeLayer('drawn-polygon-cursor');
    }
    if (map.current.getSource('drawn-polygon')) {
      map.current.removeSource('drawn-polygon');
    }
    if (map.current.getSource('drawn-polygon-points')) {
      map.current.removeSource('drawn-polygon-points');
    }
    if (map.current.getSource('drawn-polygon-cursor')) {
      map.current.removeSource('drawn-polygon-cursor');
    }

    if (drawnPolygon && drawnPolygon.length > 0) {
      // Create polygon GeoJSON - close the polygon by repeating the first point
      const closedPolygon = [...drawnPolygon, drawnPolygon[0]];
      
      const polygonGeoJSON = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [closedPolygon]
            },
            properties: {}
          }
        ]
      };

      // Create points GeoJSON for visual feedback
      const pointsGeoJSON = {
        type: 'FeatureCollection' as const,
        features: drawnPolygon.map((point, index) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: point
          },
          properties: {
            index: index + 1
          }
        }))
      };

      // Add polygon source
      map.current.addSource('drawn-polygon', {
        type: 'geojson',
        data: polygonGeoJSON
      });

      // Add points source
      map.current.addSource('drawn-polygon-points', {
        type: 'geojson',
        data: pointsGeoJSON
      });

      // Add polygon fill layer
      map.current.addLayer({
        id: 'drawn-polygon',
        type: 'fill',
        source: 'drawn-polygon',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.3
        }
      });

      // Add polygon outline layer
      map.current.addLayer({
        id: 'drawn-polygon-outline',
        type: 'line',
        source: 'drawn-polygon',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3,
          'line-opacity': 0.8
        }
      });

      // Add points layer for visual feedback (zoom-responsive)
      map.current.addLayer({
        id: 'drawn-polygon-points',
        type: 'circle',
        source: 'drawn-polygon-points',
        paint: {
          'circle-color': '#3b82f6',
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 8,   // Larger at low zoom (global view)
            10, 6,  // Medium at mid zoom
            18, 4   // Smaller at high zoom
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      });
    }
  }, [mapLoaded, drawnPolygon]);

  // Update cursor visualization for drawing mode
  useEffect(() => {
    if (!map.current || !mapLoaded || !isDrawingMode) return;

    // Remove existing cursor layer and source
    if (map.current.getLayer('drawn-polygon-cursor')) {
      map.current.removeLayer('drawn-polygon-cursor');
    }
    if (map.current.getSource('drawn-polygon-cursor')) {
      map.current.removeSource('drawn-polygon-cursor');
    }

    if (cursorPosition) {
      // Create cursor GeoJSON
      const cursorGeoJSON = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: cursorPosition
            },
            properties: {}
          }
        ]
      };

      // Add cursor source
      map.current.addSource('drawn-polygon-cursor', {
        type: 'geojson',
        data: cursorGeoJSON
      });

      // Add cursor layer (semi-transparent circle with zoom-based sizing)
      map.current.addLayer({
        id: 'drawn-polygon-cursor',
        type: 'circle',
        source: 'drawn-polygon-cursor',
        paint: {
          'circle-color': '#3b82f6',
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 8,   // Larger at low zoom (global view)
            10, 6,  // Medium at mid zoom
            18, 4   // Smaller at high zoom
          ],
          'circle-opacity': 0.4,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-opacity': 0.8
        }
      });
    }
  }, [mapLoaded, isDrawingMode, cursorPosition]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Latency Ring Toggle */}
      <LatencyRingToggle />
      
      {/* Power Overlay Controls */}
      <PowerOverlayControls />
      
      {/* Floating controls */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-10">
        <button
          onClick={() => {
            if (map.current) {
              map.current.flyTo({
                center: MAPBOX_CONFIG.center,
                zoom: MAPBOX_CONFIG.zoom,
                duration: 1000
              });
            }
          }}
          className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
          title="Reset view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        
        <button
          onClick={() => {
            if (map.current) {
              map.current.easeTo({
                zoom: 1,
                duration: 1000
              });
            }
          }}
          className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
          title="Country view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg">
        <div className="text-sm font-medium mb-2">Node Types</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs">Colocation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs">Cloud</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-xs">GridSite</span>
          </div>
        </div>
        
        {/* Latency Radius Legend */}
        {(selectedNodes.length > 0 || latencyRingMode.enabled) && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-sm font-medium mb-2">
              {latencyRingMode.enabled ? `Latency Rings (${latencyRingMode.threshold}ms RTT)` : 'Latency Radius'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#00ff00'}}></div>
                <span className="text-xs">5ms RTT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#ffff00'}}></div>
                <span className="text-xs">10ms RTT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#ffa500'}}></div>
                <span className="text-xs">15ms RTT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#ff6600'}}></div>
                <span className="text-xs">20ms RTT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#ff0000'}}></div>
                <span className="text-xs">25ms RTT</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function createPointOfUseMarker(): HTMLElement {
  const marker = document.createElement('div');
  marker.id = 'point-of-use-marker';
  marker.className = 'w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow-lg';
  return marker;
}
