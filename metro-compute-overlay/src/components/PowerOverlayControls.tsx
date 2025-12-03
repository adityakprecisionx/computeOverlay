'use client';

import { useAppStore } from '@/lib/store';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export default function PowerOverlayControls() {
  const { powerOverlay, setPowerOverlay } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setPowerOverlay({
      enabled: !powerOverlay.enabled,
    });
  };

  const handleSubLayerToggle = (layer: 'transmission' | 'substations' | 'plants') => {
    setPowerOverlay({
      enabled: powerOverlay.enabled,
      subLayers: {
        [layer]: !powerOverlay.subLayers[layer],
      },
    });
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 min-w-[280px] z-10" style={{ marginTop: '280px' }}>
      {/* Main Toggle */}
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={powerOverlay.enabled}
            onChange={handleToggle}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-gray-900">Power (TX)</span>
        </label>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {powerOverlay.enabled && (
        <div className="text-xs text-gray-600 mb-3">
          Texas transmission lines, substations, and generation.
        </div>
      )}

      {/* Sub-layer Controls */}
      {powerOverlay.enabled && isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={powerOverlay.subLayers.transmission}
              onChange={() => handleSubLayerToggle('transmission')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Transmission (138/345 kV)</span>
          </label>

          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={powerOverlay.subLayers.substations}
              onChange={() => handleSubLayerToggle('substations')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Substations</span>
          </label>

          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={powerOverlay.subLayers.plants}
              onChange={() => handleSubLayerToggle('plants')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Power Plants</span>
          </label>
        </div>
      )}

      {/* Mini Legend */}
      {powerOverlay.enabled && isExpanded && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500"></div>
              <span className="text-xs text-gray-600">Bulk transmission (138–345 kV)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500 border border-white"></div>
              <span className="text-xs text-gray-600">Substations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
              <span className="text-xs text-gray-600">Power plants</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

