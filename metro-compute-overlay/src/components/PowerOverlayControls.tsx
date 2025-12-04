'use client';

import { useAppStore } from '@/lib/store';
import { Zap, ChevronDown, ChevronUp, Server, Wifi, Filter } from 'lucide-react';
import { useState } from 'react';
import { LATENCY_RADIUS_CONFIG } from '@/lib/constants';
import type { NodeType, VacancyLevel } from '@/lib/types';

export default function PowerOverlayControls() {
  const { 
    powerOverlay, 
    setPowerOverlay, 
    showDataCenters, 
    setShowDataCenters,
    latencyRingMode,
    setLatencyRingMode,
    filters,
    setFilters
  } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const availableThresholds = Object.keys(LATENCY_RADIUS_CONFIG).map(Number).sort((a, b) => a - b);
  const nodeTypes: NodeType[] = ['colo', 'cloud', 'gridsite'];
  const operators = ['AWS', 'Google Cloud', 'Microsoft Azure', 'CoreWeave', 'Equinix', 'Digital Realty', 'CyrusOne', 'Aligned', 'QTS', 'DataBank'];
  const vacancyLevels: VacancyLevel[] = ['low', 'medium', 'high'];

  const handlePowerToggle = () => {
    setPowerOverlay({
      enabled: !powerOverlay.enabled,
    });
  };

  const handleSubLayerToggle = (layer: 'transmission' | 'substations' | 'plants') => {
    setPowerOverlay({
      enabled: powerOverlay.enabled,
      subLayers: {
        ...powerOverlay.subLayers, // Preserve all existing sub-layers
        [layer]: !powerOverlay.subLayers[layer], // Toggle only the selected one
      },
    });
  };

  const handleLatencyToggle = () => {
    setLatencyRingMode({
      enabled: !latencyRingMode.enabled,
      threshold: latencyRingMode.threshold,
      radiusMultiplier: latencyRingMode.radiusMultiplier
    });
  };

  const handleThresholdChange = (threshold: number) => {
    setLatencyRingMode({
      enabled: latencyRingMode.enabled,
      threshold,
      radiusMultiplier: latencyRingMode.radiusMultiplier
    });
  };

  const handleRadiusMultiplierChange = (radiusMultiplier: 1 | 2) => {
    setLatencyRingMode({
      enabled: latencyRingMode.enabled,
      threshold: latencyRingMode.threshold,
      radiusMultiplier
    });
  };

  const updateFilter = (key: keyof typeof filters, value: string, checked: boolean) => {
    const currentValues = filters[key] || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter((v: string) => v !== value);
    
    setFilters({
      ...filters,
      [key]: newValues
    });
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 min-w-[280px] z-10">
      {/* Main Toggle Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={powerOverlay.enabled}
              onChange={handlePowerToggle}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-900">Power</span>
          </label>
        </div>
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

      {/* Data Centers Toggle - Always visible */}
      <div className="mb-2">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showDataCenters}
            onChange={(e) => setShowDataCenters(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <Server className="w-4 h-4 text-gray-600 ml-2" />
          <span className="ml-2 text-sm text-gray-700">Data Centers</span>
        </label>
      </div>

      {/* Latency Rings Toggle - Always visible */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Latency Rings</span>
        </div>
        <button
          onClick={handleLatencyToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            latencyRingMode.enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              latencyRingMode.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Expanded Section */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-4">
          {/* Power Sub-layer Controls */}
          {powerOverlay.enabled && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700 mb-2">Power Layers</div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={powerOverlay.subLayers.transmission}
                  onChange={() => handleSubLayerToggle('transmission')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Transmission Lines</span>
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

          {/* Latency Ring Settings */}
          {latencyRingMode.enabled && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-gray-700 mb-2">Latency Settings</div>
              
              {/* Threshold Selection */}
              <div>
                <div className="text-xs text-gray-500 mb-2">Select latency threshold:</div>
                <div className="space-y-1">
                  {availableThresholds.map((threshold) => (
                    <label
                      key={threshold}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="radio"
                        name="latency-threshold"
                        value={threshold}
                        checked={latencyRingMode.threshold === threshold}
                        onChange={() => handleThresholdChange(threshold)}
                        className="w-3 h-3 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        {threshold}ms RTT
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Radius Configuration */}
              <div>
                <div className="text-xs text-gray-500 mb-2">Radius Configuration:</div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="radio"
                      name="radius-config"
                      value="1"
                      checked={latencyRingMode.radiusMultiplier === 1}
                      onChange={() => handleRadiusMultiplierChange(1)}
                      className="w-3 h-3 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Conservative</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="radio"
                      name="radius-config"
                      value="2"
                      checked={latencyRingMode.radiusMultiplier === 2}
                      onChange={() => handleRadiusMultiplierChange(2)}
                      className="w-3 h-3 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Standard</span>
                  </label>
                </div>
              </div>

              {/* Filters Section */}
              <div className="border-t pt-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 w-full"
                >
                  <Filter className="w-3 h-3" />
                  <span>Filters</span>
                  {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showFilters && (
                  <div className="mt-2 space-y-3">
                    {/* Node Type Filter */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Node Type</div>
                      <div className="space-y-1">
                        {nodeTypes.map((type) => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.type.includes(type)}
                              onChange={(e) => updateFilter('type', type, e.target.checked)}
                              className="w-3 h-3 text-blue-600 rounded"
                            />
                            <span className="text-xs text-gray-700 capitalize">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Operator Filter */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Operator</div>
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {operators.map((operator) => (
                          <label key={operator} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.operator.includes(operator)}
                              onChange={(e) => updateFilter('operator', operator, e.target.checked)}
                              className="w-3 h-3 text-blue-600 rounded"
                            />
                            <span className="text-xs text-gray-700">{operator}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Vacancy Filter */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Vacancy</div>
                      <div className="space-y-1">
                        {vacancyLevels.map((level) => (
                          <label key={level} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.vacancy.includes(level)}
                              onChange={(e) => updateFilter('vacancy', level, e.target.checked)}
                              className="w-3 h-3 text-blue-600 rounded"
                            />
                            <span className="text-xs text-gray-700 capitalize">{level}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Power Legend */}
          {powerOverlay.enabled && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5" style={{ backgroundColor: '#FFD700' }}></div>
                  <span className="text-xs text-gray-600">&lt; 100 kV</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5" style={{ backgroundColor: '#FFA500' }}></div>
                  <span className="text-xs text-gray-600">100-160 kV</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5" style={{ backgroundColor: '#FF4500' }}></div>
                  <span className="text-xs text-gray-600">220-287 kV</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5" style={{ backgroundColor: '#CC0000' }}></div>
                  <span className="text-xs text-gray-600">345 kV</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5" style={{ backgroundColor: '#00008B' }}></div>
                  <span className="text-xs text-gray-600">500 kV</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5" style={{ backgroundColor: '#8A2BE2' }}></div>
                  <span className="text-xs text-gray-600">735+ kV</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5" style={{ backgroundColor: '#808080' }}></div>
                  <span className="text-xs text-gray-600">Other</span>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7B68EE' }}></div>
                  <span className="text-xs text-gray-600">Substations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF6B6B' }}></div>
                  <span className="text-xs text-gray-600">Power plants</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
