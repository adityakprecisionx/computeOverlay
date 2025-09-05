'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { decodeStateFromUrl } from '@/lib/url-state';
import MapCanvas from '@/components/MapCanvas';
import LeftDrawer from '@/components/LeftDrawer';
import CompareModal from '@/components/CompareModal';
import ShareButton from '@/components/ShareButton';

import { Menu, Plus, Trash2, MapPin } from 'lucide-react';
import type { Node } from '@/lib/types';

export default function Home() {
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [isPlacingGridSite, setIsPlacingGridSite] = useState(false);
  const [isPlacingPointOfUse, setIsPlacingPointOfUse] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [showFillRegionModal, setShowFillRegionModal] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState<[number, number][] | null>(null);
  const [showLatencyModal, setShowLatencyModal] = useState(false);
  const [radiusMultiplier, setRadiusMultiplier] = useState<1 | 2>(1); // 1 = current, 2 = doubled
  const [calculateOnlyMode, setCalculateOnlyMode] = useState(false);
  
  const {
    compareMode,
    setCompareMode,
    setPointOfUse,
    setSelectedWorkload,
    setFilters,
    addUserGridSite,
    removeUserGridSite,
    setSelectedNodes,
    userGridSites
  } = useAppStore();

  // Load state from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const state = decodeStateFromUrl(urlParams);
      
      if (state.pointOfUse) {
        setPointOfUse(state.pointOfUse);
      }
      if (state.selectedWorkload) {
        setSelectedWorkload(state.selectedWorkload);
      }
      if (state.filters) {
        setFilters(state.filters);
      }
      if (state.userGridSites) {
        state.userGridSites.forEach(site => addUserGridSite(site));
      }
      if (state.selectedNodes) {
        setSelectedNodes(state.selectedNodes);
      }
      if (state.compareMode) {
        setCompareMode(true);
      }
    }
  }, [setPointOfUse, setSelectedWorkload, setFilters, addUserGridSite, setSelectedNodes, setCompareMode]);

  const handleNodeClick = useCallback((node: Node) => {
    if (isDeleteMode && node.type === 'gridsite') {
      // Delete the gridsite node
      removeUserGridSite(node.id);
      setIsDeleteMode(false);
    } else {
      // Handle normal node click - could be used for showing node details
      console.log('Node clicked:', node.name);
    }
  }, [isDeleteMode, removeUserGridSite]);

  const handleMapClick = useCallback((lat: number, lon: number) => {
    if (isPlacingGridSite) {
      // Place GridSite container at clicked location
      const newGridSite = {
        id: `gridsite-${Date.now()}`,
        name: 'GridSite Container (user-placed)',
        type: 'gridsite' as const,
        operator: 'GridSite',
        lat,
        lon,
        pricing: {
          usd_per_kw_month: 120,
          rack_usd_month: 900
        },
        vacancy: 'high' as const,
        meta: {
          notes: 'User-placed GridSite container. Configure pricing as needed.'
        }
      };
      
      addUserGridSite(newGridSite);
      setIsPlacingGridSite(false);
    } else if (isPlacingPointOfUse) {
      // Set point of use
      setPointOfUse({
        lat,
        lon,
        address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
      });
      setIsPlacingPointOfUse(false);
    }
  }, [setPointOfUse, addUserGridSite, isPlacingGridSite, isPlacingPointOfUse]);

  const handleAddGridSite = () => {
    if (isPlacingGridSite) {
      // Cancel placement mode
      setIsPlacingGridSite(false);
    } else {
      // Enter placement mode
      setIsPlacingGridSite(true);
      setIsDeleteMode(false); // Exit delete mode if active
    }
  };

  const handleDeleteMode = () => {
    if (isDeleteMode) {
      // Cancel delete mode
      setIsDeleteMode(false);
    } else {
      // Enter delete mode
      setIsDeleteMode(true);
      setIsPlacingGridSite(false); // Exit placement mode if active
    }
  };

  const handleFillRegion = (latencyThreshold: number, useCustomShape: boolean = false, calculateOnly: boolean = false) => {
    let bounds;
    
    if (useCustomShape && drawnPolygon) {
      // Use custom drawn polygon
      bounds = getPolygonBounds(drawnPolygon);
    } else {
      // Use Dallas-Fort Worth area bounds (adjusted to cover more Fort Worth)
      bounds = {
        north: 33.3,
        south: 32.6,
        east: -96.5,
        west: -97.4
      };
    }

    // Get radius for the latency threshold
    const radiusKm = getRadiusForLatency(latencyThreshold);

    // Calculate grid spacing (hexagonal packing for optimal coverage)
    const spacing = radiusKm * 1.73; // Hexagonal spacing
    const spacingDegrees = spacing / 111;

    const gridsites: Node[] = [];
    let count = 0;

    // Generate grid points
    for (let lat = bounds.south; lat <= bounds.north; lat += spacingDegrees) {
      for (let lon = bounds.west; lon <= bounds.east; lon += spacingDegrees) {
        // Offset every other row for hexagonal packing
        const offsetLon = (Math.floor((lat - bounds.south) / spacingDegrees) % 2) * (spacingDegrees / 2);
        const finalLon = lon + offsetLon;

        // Check if point is within bounds
        if (finalLon >= bounds.west && finalLon <= bounds.east) {
          // If using custom shape, check if point is inside polygon
          if (useCustomShape && drawnPolygon) {
            if (!isPointInPolygon([finalLon, lat], drawnPolygon)) {
              continue;
            }
          }

          const newGridSite: Node = {
            id: `fill-gridsite-${latencyThreshold}-${count++}`,
            name: `GridSite ${latencyThreshold}ms #${count}`,
            type: 'gridsite' as const,
            operator: 'GridSite',
            lat,
            lon: finalLon,
            pricing: {
              usd_per_kw_month: 120,
              rack_usd_month: 900
            },
            vacancy: 'high' as const,
            meta: {
              notes: `Auto-placed for ${latencyThreshold}ms coverage`
            }
          };
          gridsites.push(newGridSite);
        }
      }
    }

    if (calculateOnly) {
      // Just show the count without placing gridsites
      alert(`Coverage calculation for ${latencyThreshold}ms (${radiusMultiplier === 1 ? 'Conservative' : 'Standard'} radius):\n\n${gridsites.length} GridSites required\n\nArea: ${((bounds.east - bounds.west) * (bounds.north - bounds.south)).toFixed(1)} degrees²`);
    } else {
      // Add all gridsites to the store
      gridsites.forEach(site => addUserGridSite(site));
    }
    
    setShowFillRegionModal(false);
    setIsDrawingMode(false);
    setDrawnPolygon(null);
  };

  const getRadiusForLatency = (latencyMs: number, multiplier: number = radiusMultiplier): number => {
    const radiusConfig: { [key: number]: number } = {
      5: 1.207,
      10: 3.218,
      15: 9.724,
      20: 28.163,
      25: 56.327
    };
    const baseRadius = radiusConfig[latencyMs] || 3.218; // Default to 10ms radius
    return baseRadius * multiplier;
  };

  const handleDeleteAllGridSites = () => {
    // Remove all user-created gridsites
    userGridSites.forEach(site => removeUserGridSite(site.id));
    setIsDeleteMode(false); // Exit delete mode if active
  };

  // Point-in-polygon algorithm (ray casting)
  const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // Get bounding box of a polygon
  const getPolygonBounds = (polygon: [number, number][]) => {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    
    polygon.forEach(([lon, lat]) => {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
    
    return {
      north: maxLat,
      south: minLat,
      east: maxLon,
      west: minLon
    };
  };

  const handleStartDrawing = () => {
    setIsDrawingMode(true);
    setDrawnPolygon(null);
    setShowFillRegionModal(false);
  };

  const handlePolygonComplete = () => {
    if (drawnPolygon && drawnPolygon.length >= 3) {
      setIsDrawingMode(false);
      setShowLatencyModal(true);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLeftDrawerOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">
            Metro Compute Overlay
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <ShareButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        <MapCanvas
          onNodeClick={handleNodeClick}
          onMapClick={handleMapClick}
          isPlacingGridSite={isPlacingGridSite}
          isPlacingPointOfUse={isPlacingPointOfUse}
          isDeleteMode={isDeleteMode}
          isDrawingMode={isDrawingMode}
          drawnPolygon={drawnPolygon}
          setDrawnPolygon={setDrawnPolygon}
        />
        

        
        {/* GridSite Counter */}
        {userGridSites.length > 0 && (
          <div className="absolute bottom-80 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="text-sm font-medium">
              {userGridSites.length} GridSite{userGridSites.length !== 1 ? 's' : ''} Active
            </div>
          </div>
        )}

        {/* Action Buttons - Bottom Right with more spacing */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-6">
          {/* Fill Region Button */}
          <button
            onClick={() => setShowFillRegionModal(true)}
            className="p-4 rounded-full shadow-lg transition-colors bg-green-600 hover:bg-green-700 text-white"
            title="Fill region with GridSite containers"
          >
            <MapPin className="w-6 h-6" />
          </button>
          
          {/* Delete All Button - only show if there are gridsites */}
          {userGridSites.length > 0 && (
            <button
              onClick={handleDeleteAllGridSites}
              className="p-4 rounded-full shadow-lg transition-colors bg-red-600 hover:bg-red-700 text-white"
              title="Delete all GridSite containers"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          
          {/* Delete Individual Button */}
          <button
            onClick={handleDeleteMode}
            className={`p-4 rounded-full shadow-lg transition-colors ${
              isDeleteMode 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            title={isDeleteMode ? "Click on a GridSite to delete it" : "Delete individual GridSite containers"}
          >
            <Trash2 className="w-6 h-6" />
          </button>
          
          {/* Add GridSite Button */}
          <button
            onClick={handleAddGridSite}
            className={`p-4 rounded-full shadow-lg transition-colors ${
              isPlacingGridSite 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
            title={isPlacingGridSite ? "Click on map to place GridSite container" : "Add individual GridSite container"}
          >
            {isPlacingGridSite ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <Plus className="w-6 h-6" />
            )}
          </button>
        </div>
        
        {/* Status indicators */}
        {isPlacingGridSite && (
          <div className="absolute bottom-48 right-4 bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg">
            <div className="text-sm font-medium">Click on map to place GridSite</div>
          </div>
        )}
        
        {isDeleteMode && (
          <div className="absolute bottom-48 right-4 bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg">
            <div className="text-sm font-medium">Click on a GridSite to delete it</div>
          </div>
        )}
        
        {isDrawingMode && (
          <div className="absolute bottom-48 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg">
            <div className="text-sm font-medium">Press &apos;A&apos; to add points</div>
            <div className="text-xs opacity-90">Enter to complete • Escape to cancel</div>
            <div className="text-xs opacity-75 mt-1">Works anywhere in the world</div>
            {drawnPolygon && drawnPolygon.length >= 3 && (
              <button
                onClick={handlePolygonComplete}
                className="mt-2 px-3 py-1 bg-white text-blue-600 rounded text-xs font-medium hover:bg-gray-100"
              >
                Complete Polygon
              </button>
            )}
          </div>
        )}
      </div>

      {/* Left Drawer */}
      <LeftDrawer
        isOpen={leftDrawerOpen}
        onClose={() => setLeftDrawerOpen(false)}
        isPlacingPointOfUse={isPlacingPointOfUse}
        setIsPlacingPointOfUse={setIsPlacingPointOfUse}
      />

      {/* Compare Modal */}
      <CompareModal
        isOpen={compareMode}
        onClose={() => setCompareMode(false)}
      />

      {/* Fill Region Modal */}
      {showFillRegionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Fill Region</h2>
            <p className="text-gray-600 mb-6">
              Choose how to fill the area with GridSite containers for optimal coverage.
            </p>
            
            <div className="space-y-4 mb-6">
              <button
                onClick={handleStartDrawing}
                className="w-full p-4 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-colors text-left border-2 border-blue-300"
              >
                <div className="font-medium flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Draw Custom Shape
                </div>
                <div className="text-sm text-blue-600 mt-1">Draw a polygon on the map to define your coverage area</div>
              </button>
              
              <div className="text-center text-gray-500 text-sm">OR</div>
              
              <div className="text-sm font-medium text-gray-700">Fill entire Dallas area:</div>
            </div>
            
            {/* Radius Configuration Selector */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Radius Configuration:</div>
              <div className="flex gap-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="radiusConfig"
                    value="1"
                    checked={radiusMultiplier === 1}
                    onChange={(e) => setRadiusMultiplier(Number(e.target.value) as 1 | 2)}
                    className="mr-2"
                  />
                  <span className="text-sm">Conservative</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="radiusConfig"
                    value="2"
                    checked={radiusMultiplier === 2}
                    onChange={(e) => setRadiusMultiplier(Number(e.target.value) as 1 | 2)}
                    className="mr-2"
                  />
                  <span className="text-sm">Standard</span>
                </label>
              </div>
            </div>

            {/* Calculate Only Mode Toggle */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calculateOnlyMode}
                  onChange={(e) => setCalculateOnlyMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-blue-800">Calculate Only (No Rendering)</span>
              </label>
              <div className="text-xs text-blue-600 mt-1">
                Just show the number of GridSites needed without placing them on the map
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleFillRegion(5, false, calculateOnlyMode)}
                className="w-full p-3 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg transition-colors text-left"
              >
                <div className="font-medium">5ms Coverage</div>
                <div className="text-sm text-green-600">
                  ~{getRadiusForLatency(5).toFixed(1)}km radius - {radiusMultiplier === 1 ? 'High' : 'Medium'} density
                </div>
              </button>
              
              <button
                onClick={() => handleFillRegion(10, false, calculateOnlyMode)}
                className="w-full p-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors text-left"
              >
                <div className="font-medium">10ms Coverage</div>
                <div className="text-sm text-yellow-600">
                  ~{getRadiusForLatency(10).toFixed(1)}km radius - {radiusMultiplier === 1 ? 'Medium' : 'Low'} density
                </div>
              </button>
              
              <button
                onClick={() => handleFillRegion(15, false, calculateOnlyMode)}
                className="w-full p-3 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg transition-colors text-left"
              >
                <div className="font-medium">15ms Coverage</div>
                <div className="text-sm text-orange-600">
                  ~{getRadiusForLatency(15).toFixed(1)}km radius - {radiusMultiplier === 1 ? 'Low' : 'Very low'} density
                </div>
              </button>
              
              <button
                onClick={() => handleFillRegion(20, false, calculateOnlyMode)}
                className="w-full p-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors text-left"
              >
                <div className="font-medium">20ms Coverage</div>
                <div className="text-sm text-red-600">
                  ~{getRadiusForLatency(20).toFixed(1)}km radius - Very low density
                </div>
              </button>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFillRegionModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Latency Selection Modal for Custom Shape */}
      {showLatencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Select Coverage Latency</h2>
            <p className="text-gray-600 mb-6">
              Choose the latency threshold for your custom shape coverage.
            </p>
            
            {/* Radius Configuration Selector */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Radius Configuration:</div>
              <div className="flex gap-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="radiusConfigCustom"
                    value="1"
                    checked={radiusMultiplier === 1}
                    onChange={(e) => setRadiusMultiplier(Number(e.target.value) as 1 | 2)}
                    className="mr-2"
                  />
                  <span className="text-sm">Conservative</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="radiusConfigCustom"
                    value="2"
                    checked={radiusMultiplier === 2}
                    onChange={(e) => setRadiusMultiplier(Number(e.target.value) as 1 | 2)}
                    className="mr-2"
                  />
                  <span className="text-sm">Standard</span>
                </label>
              </div>
            </div>

            {/* Calculate Only Mode Toggle */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calculateOnlyMode}
                  onChange={(e) => setCalculateOnlyMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-blue-800">Calculate Only (No Rendering)</span>
              </label>
              <div className="text-xs text-blue-600 mt-1">
                Just show the number of GridSites needed without placing them on the map
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleFillRegion(5, true, calculateOnlyMode)}
                className="w-full p-3 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg transition-colors text-left"
              >
                <div className="font-medium">5ms Coverage</div>
                <div className="text-sm text-green-600">
                  ~{getRadiusForLatency(5).toFixed(1)}km radius - {radiusMultiplier === 1 ? 'High' : 'Medium'} density
                </div>
              </button>
              
              <button
                onClick={() => handleFillRegion(10, true, calculateOnlyMode)}
                className="w-full p-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors text-left"
              >
                <div className="font-medium">10ms Coverage</div>
                <div className="text-sm text-yellow-600">
                  ~{getRadiusForLatency(10).toFixed(1)}km radius - {radiusMultiplier === 1 ? 'Medium' : 'Low'} density
                </div>
              </button>
              
              <button
                onClick={() => handleFillRegion(15, true, calculateOnlyMode)}
                className="w-full p-3 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg transition-colors text-left"
              >
                <div className="font-medium">15ms Coverage</div>
                <div className="text-sm text-orange-600">
                  ~{getRadiusForLatency(15).toFixed(1)}km radius - {radiusMultiplier === 1 ? 'Low' : 'Very low'} density
                </div>
              </button>
              
              <button
                onClick={() => handleFillRegion(20, true, calculateOnlyMode)}
                className="w-full p-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors text-left"
              >
                <div className="font-medium">20ms Coverage</div>
                <div className="text-sm text-red-600">
                  ~{getRadiusForLatency(20).toFixed(1)}km radius - Very low density
                </div>
              </button>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowLatencyModal(false);
                  setDrawnPolygon(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
