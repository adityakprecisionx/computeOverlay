'use client';

import { useAppStore } from '@/lib/store';
import { getNodeTypeColor, getVacancyColor } from '@/lib/utils';
import { Cloud, MapPin } from 'lucide-react';

export default function CloudProviderCards() {
  const {
    selectedNodes,
    toggleNodeSelection,
    getOffMapNodes
  } = useAppStore();

  const offMapNodes = getOffMapNodes();

  if (offMapNodes.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm max-h-96 overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <Cloud className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900">Off-Map Cloud Providers</h3>
      </div>
      
      <div className="space-y-2">
        {offMapNodes.map((node) => (
          <button
            key={node.id}
            onClick={() => toggleNodeSelection(node.id)}
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
          </button>
        ))}
      </div>
    </div>
  );
}
