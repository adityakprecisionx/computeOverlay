'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { cn, getNodeTypeColor, getVacancyColor, formatLatency } from '@/lib/utils';
import { MapPin, Filter, Settings, BarChart3, X, Cloud } from 'lucide-react';
import type { Node, Workload, NodeType, VacancyLevel } from '@/lib/types';
import { calcCloudLatency } from '@/lib/latency';
import { calculateDistance } from '@/lib/distance';
import LocationSearch from './LocationSearch';

interface LeftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isPlacingPointOfUse: boolean;
  setIsPlacingPointOfUse: (placing: boolean) => void;
}

export default function LeftDrawer({ isOpen, onClose, isPlacingPointOfUse, setIsPlacingPointOfUse }: LeftDrawerProps) {
  const [activeTab, setActiveTab] = useState<'location' | 'workload' | 'filters' | 'compare' | 'cloud'>('location');
  
  const {
    pointOfUse,
    setPointOfUse,
    selectedWorkload,
    setSelectedWorkload,
    workloads,
    filters,
    setFilters,
    selectedNodes,
    getSelectedNodes,
    getFilteredNodes,
    getOffMapNodes,
    setCompareMode,
    toggleNodeSelection,
    nodes
  } = useAppStore();

  const selectedNodesList = getSelectedNodes();
  const filteredNodes = getFilteredNodes();
  const offMapNodes = getOffMapNodes();

  const handleLocationSelect = (location: { lat: number; lon: number; address: string }) => {
    setPointOfUse(location);
  };

  const handleMapClick = () => {
    // Enter point-of-use placement mode
    setIsPlacingPointOfUse(true);
  };

  return (
    <div className={cn(
      'fixed left-0 top-0 h-full w-[500px] bg-white shadow-xl transform transition-transform duration-300 z-50',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Metro Compute Overlay</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'location', label: 'Location', icon: MapPin },
          { id: 'workload', label: 'Workload', icon: Settings },
          { id: 'filters', label: 'Filters', icon: Filter },
          { id: 'compare', label: 'Compare', icon: BarChart3 },
          { id: 'cloud', label: 'Cloud', icon: Cloud }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as 'location' | 'workload' | 'filters' | 'compare' | 'cloud')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'location' && (
          <LocationTab
            pointOfUse={pointOfUse}
            onLocationSelect={handleLocationSelect}
            onMapClick={handleMapClick}
            isPlacingPointOfUse={isPlacingPointOfUse}
          />
        )}
        
        {activeTab === 'workload' && (
          <WorkloadTab
            selectedWorkload={selectedWorkload}
            workloads={workloads}
            onWorkloadSelect={setSelectedWorkload}
          />
        )}
        
        {activeTab === 'filters' && (
          <FiltersTab
            filters={filters}
            onFiltersChange={setFilters}
            filteredCount={filteredNodes.length}
            totalCount={nodes.length}
          />
        )}
        
        {activeTab === 'compare' && (
          <CompareTab
            selectedNodes={selectedNodesList}
            onCompare={() => setCompareMode(true)}
          />
        )}
        
        {activeTab === 'cloud' && (
          <CloudTab
            offMapNodes={offMapNodes}
            selectedNodes={selectedNodes}
            onNodeSelect={toggleNodeSelection}
          />
        )}
      </div>
    </div>
  );
}

// Location Tab Component
function LocationTab({ 
  pointOfUse, 
  onLocationSelect, 
  onMapClick,
  isPlacingPointOfUse
}: {
  pointOfUse: { lat: number; lon: number; address: string } | null;
  onLocationSelect: (location: { lat: number; lon: number; address: string }) => void;
  onMapClick: () => void;
  isPlacingPointOfUse: boolean;
}) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Point of Use</h3>
        <p className="text-sm text-gray-600 mb-4">
          Set your location to calculate latency and costs from this point.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Location
          </label>
          <LocationSearch
            placeholder="Search for a city, state, or country..."
            onLocationSelect={onLocationSelect}
            className="w-full"
          />
        </div>
      </div>

      <div className="text-center">
        <span className="text-sm text-gray-500">or</span>
      </div>

      <button
        onClick={onMapClick}
        className={`w-full py-2 px-4 rounded-md transition-colors ${
          isPlacingPointOfUse
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {isPlacingPointOfUse ? 'Click on Map to Set Location (Active)' : 'Click on Map to Set Location'}
      </button>
      
      <div className="text-xs text-gray-500 text-center">
        Click anywhere on the map to set your point of use
      </div>

      {pointOfUse && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="text-sm font-medium text-green-800">✅ Point of Use Set</div>
          <div className="text-sm text-green-700">{pointOfUse.address}</div>
          <div className="text-xs text-green-600">
            {pointOfUse.lat.toFixed(4)}, {pointOfUse.lon.toFixed(4)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            All latency and cost calculations will be based on this location
          </div>
        </div>
      )}
      
      {!pointOfUse && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="text-sm font-medium text-yellow-800">⚠️ No Point of Use Set</div>
          <div className="text-xs text-yellow-700">
            Set your location to enable latency and cost comparisons
          </div>
        </div>
      )}
    </div>
  );
}

// Workload Tab Component
function WorkloadTab({
  selectedWorkload,
  workloads,
  onWorkloadSelect
}: {
  selectedWorkload: string | null;
  workloads: Workload[];
  onWorkloadSelect: (id: string | null) => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Workload Profile</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select a workload profile to optimize latency and cost calculations.
        </p>
      </div>

      <div className="space-y-2">
        {workloads.map((workload) => (
          <button
            key={workload.id}
            onClick={() => onWorkloadSelect(workload.id)}
            className={cn(
              'w-full text-left p-3 rounded-md border transition-colors',
              selectedWorkload === workload.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="font-medium text-sm">{workload.name}</div>
            <div className="text-xs text-gray-600 mt-1">{workload.notes}</div>
          </button>
        ))}
      </div>

      {selectedWorkload && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-sm font-medium text-blue-800">Selected Workload</div>
          <div className="text-sm text-blue-700">
            {workloads.find(w => w.id === selectedWorkload)?.name}
          </div>
        </div>
      )}
    </div>
  );
}

// Filters Tab Component
function FiltersTab({
  filters,
  onFiltersChange,
  filteredCount,
  totalCount
}: {
  filters: { type: NodeType[]; operator: string[]; vacancy: VacancyLevel[] };
  onFiltersChange: (filters: { type: NodeType[]; operator: string[]; vacancy: VacancyLevel[] }) => void;
  filteredCount: number;
  totalCount: number;
}) {
  const nodeTypes: NodeType[] = ['colo', 'cloud', 'gridsite'];
  const operators = ['AWS', 'Google Cloud', 'Microsoft Azure', 'CoreWeave', 'Equinix', 'Digital Realty', 'CyrusOne', 'Aligned', 'QTS', 'DataBank'];
  const vacancyLevels: VacancyLevel[] = ['low', 'medium', 'high'];

  const updateFilter = (key: keyof typeof filters, value: string, checked: boolean) => {
    const currentValues = filters[key] || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter((v: string) => v !== value);
    
    onFiltersChange({
      ...filters,
      [key]: newValues
    });
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Filters</h3>
        <p className="text-sm text-gray-600">
          Showing {filteredCount} of {totalCount} nodes
        </p>
      </div>

      {/* Node Type Filter */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Node Type</h4>
        <div className="space-y-2">
          {nodeTypes.map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.type.includes(type)}
                onChange={(e) => updateFilter('type', type, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Operator Filter */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Operator</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {operators.map((operator) => (
            <label key={operator} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.operator.includes(operator)}
                onChange={(e) => updateFilter('operator', operator, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{operator}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Vacancy Filter */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Vacancy</h4>
        <div className="space-y-2">
          {vacancyLevels.map((level) => (
            <label key={level} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.vacancy.includes(level)}
                onChange={(e) => updateFilter('vacancy', level, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 capitalize">{level}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// Compare Tab Component
function CompareTab({
  selectedNodes,
  onCompare
}: {
  selectedNodes: Node[];
  onCompare: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Compare Nodes</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select 2-3 nodes to compare latency and costs side-by-side.
        </p>
      </div>

      {selectedNodes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-sm">No nodes selected</div>
          <div className="text-xs mt-1">Click on nodes on the map to select them for comparison</div>
          <div className="text-xs mt-1">You can select data centers, cloud providers, and GridSite containers</div>
        </div>
      ) : (
        <div className="space-y-3">
          {selectedNodes.map((node) => (
            <div
              key={node.id}
              className="p-3 border border-gray-200 rounded-md"
            >
              <div className="font-medium text-sm">{node.name}</div>
              <div className="text-xs text-gray-600">{node.operator}</div>
            </div>
          ))}

          {selectedNodes.length >= 2 && (
            <button
              onClick={onCompare}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Compare {selectedNodes.length} Nodes
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Cloud Tab Component
function CloudTab({
  offMapNodes,
  selectedNodes,
  onNodeSelect
}: {
  offMapNodes: Node[];
  selectedNodes: string[];
  onNodeSelect: (nodeId: string) => void;
}) {
  const { pointOfUse, selectedWorkload, workloads } = useAppStore();
  const currentWorkload = selectedWorkload ? workloads.find(w => w.id === selectedWorkload) : null;
  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Off-Map Cloud Providers</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select cloud providers from other regions for comparison.
        </p>
      </div>

      {offMapNodes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-sm">No off-map cloud providers available</div>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto space-y-2 pr-2">
          {offMapNodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onNodeSelect(node.id)}
              className={`w-full text-left p-3 rounded-md border transition-colors ${
                selectedNodes.includes(node.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{node.name}</div>
                  <div className="text-xs text-gray-600">{node.operator}</div>
                  {node.meta?.notes && (
                    <div className="text-xs text-gray-500 mt-1">{node.meta.notes}</div>
                  )}
                </div>
                <div className={`w-3 h-3 rounded-full ${getNodeTypeColor(node.type)}`}></div>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin className="w-3 h-3" />
                  <span>Off-map</span>
                </div>
                <div className={`text-xs ${getVacancyColor(node.vacancy)}`}>
                  {node.vacancy} vacancy
                </div>
              </div>
              
              {/* Latency calculation */}
              {pointOfUse && currentWorkload && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-600">
                    {(() => {
                      const distance = calculateDistance(
                        pointOfUse.lat,
                        pointOfUse.lon,
                        // Use approximate coordinates for off-map nodes
                        node.meta?.notes?.includes('Virginia') ? 38.9072 : 
                        node.meta?.notes?.includes('California') ? 36.7783 :
                        node.meta?.notes?.includes('Oregon') ? 44.5588 :
                        node.meta?.notes?.includes('Ohio') ? 40.3888 :
                        node.meta?.notes?.includes('Iowa') ? 41.8780 :
                        node.meta?.notes?.includes('S. Carolina') ? 33.8569 :
                        node.meta?.notes?.includes('San Antonio') ? 29.4241 :
                        32.7767, // Default to Dallas
                        node.meta?.notes?.includes('Virginia') ? -77.0369 :
                        node.meta?.notes?.includes('California') ? -119.4179 :
                        node.meta?.notes?.includes('Oregon') ? -122.0703 :
                        node.meta?.notes?.includes('Ohio') ? -82.7649 :
                        node.meta?.notes?.includes('Iowa') ? -93.0977 :
                        node.meta?.notes?.includes('S. Carolina') ? -80.9450 :
                        node.meta?.notes?.includes('San Antonio') ? -98.4936 :
                        -96.7970 // Default to Dallas
                      );
                      
                      const latency = calcCloudLatency({
                        distanceKm: distance,
                        weights: currentWorkload.latencyWeights,
                        inferenceMs: currentWorkload.inference_compute_ms.typ
                      });
                      
                      return (
                        <div className="flex justify-between items-center">
                          <span>Est. Latency:</span>
                          <span className="font-medium text-gray-900">{formatLatency(latency)}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
