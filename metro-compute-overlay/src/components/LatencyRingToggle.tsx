'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { LATENCY_RADIUS_CONFIG } from '@/lib/constants';
import { Radio, Wifi, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import type { NodeType, VacancyLevel } from '@/lib/types';

export default function LatencyRingToggle() {
  const { latencyRingMode, setLatencyRingMode, filters, setFilters } = useAppStore();
  const [showFilters, setShowFilters] = useState(false);

  const availableThresholds = Object.keys(LATENCY_RADIUS_CONFIG).map(Number).sort((a, b) => a - b);
  const nodeTypes: NodeType[] = ['colo', 'cloud', 'gridsite'];
  const operators = ['AWS', 'Google Cloud', 'Microsoft Azure', 'CoreWeave', 'Equinix', 'Digital Realty', 'CyrusOne', 'Aligned', 'QTS', 'DataBank'];
  const vacancyLevels: VacancyLevel[] = ['low', 'medium', 'high'];

  const handleToggle = () => {
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
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 min-w-[250px] z-10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Latency Rings</span>
        </div>
        <button
          onClick={handleToggle}
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

      {latencyRingMode.enabled && (
        <div className="space-y-3">
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
    </div>
  );
}
