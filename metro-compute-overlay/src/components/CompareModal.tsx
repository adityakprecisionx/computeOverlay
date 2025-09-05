'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { calculateDistance } from '@/lib/distance';
import { calcCloudLatency, calcEdgeLatency, calcLatencyBreakdown } from '@/lib/latency';
import { calcCloudCost, calcEdgeCost, calcCostBreakdown, getDefaultUsage } from '@/lib/cost';
import { formatLatency, formatCurrency, formatDistance, getNodeTypeColor } from '@/lib/utils';
import { X, TrendingUp, DollarSign } from 'lucide-react';
import type { Node, Workload } from '@/lib/types';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CompareModal({ isOpen, onClose }: CompareModalProps) {
  const [activeTab, setActiveTab] = useState<'latency' | 'cost'>('latency');
  
  const {
    getSelectedNodes,
    pointOfUse,
    getSelectedWorkload
  } = useAppStore();

  const nodes = getSelectedNodes();
  const workload = getSelectedWorkload();

  if (!isOpen || nodes.length < 2) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Compare Nodes</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('latency')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'latency'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Latency
          </button>
          <button
            onClick={() => setActiveTab('cost')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'cost'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Cost
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'latency' && (
            <LatencyComparison
              nodes={nodes}
              pointOfUse={pointOfUse}
              workload={workload}
            />
          )}
          
          {activeTab === 'cost' && (
            <CostComparison
              nodes={nodes}
              workload={workload}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Latency Comparison Component
function LatencyComparison({ nodes, pointOfUse, workload }: {
  nodes: Node[];
  pointOfUse: { lat: number; lon: number; address: string } | null;
  workload: Workload | null;
}) {
  if (!pointOfUse) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please set a point of use to compare latency. Click on the map to set your location.
      </div>
    );
  }
  
  if (!workload) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please select a workload profile to compare latency.
      </div>
    );
  }

  const calculateLatency = (node: Node) => {
    let distance: number;
    
    if (node.lat && node.lon) {
      // On-map node with coordinates
      distance = calculateDistance(
        pointOfUse.lat,
        pointOfUse.lon,
        node.lat,
        node.lon
      );
    } else {
      // Off-map cloud node - use approximate coordinates
      const nodeLat = node.meta?.notes?.includes('Virginia') ? 38.9072 : 
        node.meta?.notes?.includes('California') ? 36.7783 :
        node.meta?.notes?.includes('Oregon') ? 44.5588 :
        node.meta?.notes?.includes('Ohio') ? 40.3888 :
        node.meta?.notes?.includes('Iowa') ? 41.8780 :
        node.meta?.notes?.includes('S. Carolina') ? 33.8569 :
        node.meta?.notes?.includes('San Antonio') ? 29.4241 :
        32.7767; // Default to Dallas
      
      const nodeLon = node.meta?.notes?.includes('Virginia') ? -77.0369 :
        node.meta?.notes?.includes('California') ? -119.4179 :
        node.meta?.notes?.includes('Oregon') ? -122.0703 :
        node.meta?.notes?.includes('Ohio') ? -82.7649 :
        node.meta?.notes?.includes('Iowa') ? -93.0977 :
        node.meta?.notes?.includes('S. Carolina') ? -80.9450 :
        node.meta?.notes?.includes('San Antonio') ? -98.4936 :
        -96.7970; // Default to Dallas
      
      distance = calculateDistance(
        pointOfUse.lat,
        pointOfUse.lon,
        nodeLat,
        nodeLon
      );
    }

    const inferenceMs = workload.inference_compute_ms.typ;
    
    if (node.type === 'cloud') {
      return calcCloudLatency({
        distanceKm: distance,
        weights: workload.latencyWeights,
        inferenceMs
      });
    } else {
      return calcEdgeLatency({
        distanceKm: distance,
        inferenceMs
      });
    }
  };

  const latencies = nodes.map(node => {
    let distance: number;
    
    if (node.lat && node.lon) {
      // On-map node with coordinates
      distance = calculateDistance(
        pointOfUse.lat,
        pointOfUse.lon,
        node.lat,
        node.lon
      );
    } else {
      // Off-map cloud node - use approximate coordinates
      const nodeLat = node.meta?.notes?.includes('Virginia') ? 38.9072 : 
        node.meta?.notes?.includes('California') ? 36.7783 :
        node.meta?.notes?.includes('Oregon') ? 44.5588 :
        node.meta?.notes?.includes('Ohio') ? 40.3888 :
        node.meta?.notes?.includes('Iowa') ? 41.8780 :
        node.meta?.notes?.includes('S. Carolina') ? 33.8569 :
        node.meta?.notes?.includes('San Antonio') ? 29.4241 :
        32.7767; // Default to Dallas
      
      const nodeLon = node.meta?.notes?.includes('Virginia') ? -77.0369 :
        node.meta?.notes?.includes('California') ? -119.4179 :
        node.meta?.notes?.includes('Oregon') ? -122.0703 :
        node.meta?.notes?.includes('Ohio') ? -82.7649 :
        node.meta?.notes?.includes('Iowa') ? -93.0977 :
        node.meta?.notes?.includes('S. Carolina') ? -80.9450 :
        node.meta?.notes?.includes('San Antonio') ? -98.4936 :
        -96.7970; // Default to Dallas
      
      distance = calculateDistance(
        pointOfUse.lat,
        pointOfUse.lon,
        nodeLat,
        nodeLon
      );
    }
    
    return {
      node,
      latency: calculateLatency(node),
      distance
    };
  });

  // Sort by latency
  latencies.sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity));

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Latency Comparison</h3>
        <p className="text-sm text-gray-600">
          From {pointOfUse.address} using {workload.name} workload
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {latencies.map(({ node, latency, distance }, index) => (
          <div
            key={node.id}
            className={`p-4 border rounded-lg ${
              index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium text-sm">{node.name}</div>
                <div className="text-xs text-gray-600">{node.operator}</div>
              </div>
              <div className={`w-3 h-3 rounded-full ${getNodeTypeColor(node.type)}`}></div>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">
                {formatLatency(latency || 0)}
              </div>
              <div className="text-xs text-gray-600">
                Distance: {formatDistance(distance)}
              </div>
              {index === 0 && (
                <div className="text-xs text-green-600 font-medium">
                  ⭐ Best latency
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Breakdown */}
      <div className="mt-6">
        <h4 className="text-md font-medium mb-3">Detailed Latency Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Component</th>
                {latencies.map(({ node }) => (
                  <th key={node.id} className="text-left py-2 px-2">
                    {node.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {latencies[0]?.latency && (
                <>
                                     <tr className="border-b">
                     <td className="py-2 font-medium">Propagation</td>
                     {latencies.map(({ node, distance }) => {
                      const breakdown = node.type === 'cloud' 
                        ? calcLatencyBreakdown({
                            distanceKm: distance!,
                            weights: workload.latencyWeights,
                            inferenceMs: workload.inference_compute_ms.typ
                          })
                        : calcLatencyBreakdown({
                            distanceKm: distance!,
                            weights: workload.latencyWeights,
                            inferenceMs: workload.inference_compute_ms.typ
                          }, true);
                      
                      return (
                        <td key={node.id} className="py-2 px-2">
                          {formatLatency(breakdown.propagation)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">Inference</td>
                    {latencies.map(({ node }) => (
                      <td key={node.id} className="py-2 px-2">
                        {formatLatency(workload.inference_compute_ms.typ)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-2 font-bold">Total</td>
                    {latencies.map(({ latency }) => (
                      <td key={latency} className="py-2 px-2 font-bold">
                        {formatLatency(latency!)}
                      </td>
                    ))}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Cost Comparison Component
function CostComparison({ nodes, workload }: {
  nodes: Node[];
  workload: Workload | null;
}) {
  if (!workload) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please select a workload profile to compare costs.
      </div>
    );
  }

  const usage = getDefaultUsage(workload.costFlags);
  
  const calculateCost = (node: Node) => {
    if (node.type === 'cloud') {
      return calcCloudCost(node, usage, workload.costFlags);
    } else {
      return calcEdgeCost(node, usage, workload.costFlags);
    }
  };

  const costs = nodes.map(node => ({
    node,
    cost: calculateCost(node),
    breakdown: calcCostBreakdown(node, usage, workload.costFlags)
  }));

  // Sort by cost
  costs.sort((a, b) => a.cost - b.cost);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Cost Comparison</h3>
        <p className="text-sm text-gray-600">
          Monthly costs for {workload.name} workload
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {costs.map(({ node, cost, breakdown }, index) => (
          <div
            key={node.id}
            className={`p-4 border rounded-lg ${
              index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium text-sm">{node.name}</div>
                <div className="text-xs text-gray-600">{node.operator}</div>
              </div>
              <div className={`w-3 h-3 rounded-full ${getNodeTypeColor(node.type)}`}></div>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(cost)}
              </div>
              <div className="text-xs text-gray-600">
                per month
              </div>
              {index === 0 && (
                <div className="text-xs text-green-600 font-medium">
                  💰 Lowest cost
                </div>
              )}
            </div>

            {/* Cost breakdown */}
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs font-medium text-gray-700 mb-2">Cost Breakdown</div>
              <div className="space-y-1">
                {Object.entries(breakdown).map(([key, value]) => {
                  if (key === 'total') return null;
                  return (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                      <span className="text-gray-900">
                        {formatCurrency(value as number)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-md font-medium mb-2">Usage Assumptions</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Hours/month</div>
            <div className="font-medium">{usage.hours}</div>
          </div>
          <div>
            <div className="text-gray-600">Egress (GB)</div>
            <div className="font-medium">{usage.egressGB.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-600">Storage (GB)</div>
            <div className="font-medium">{usage.storageGB.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-600">Power (kW)</div>
            <div className="font-medium">{usage.kW}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
