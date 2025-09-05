import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Workload, AppState, MapState } from './types';
import nodesData from '../seed/nodes.json';
import workloadsData from '../seed/workloads.json';

interface AppStore extends AppState {
  // Nodes and workloads
  nodes: Node[];
  workloads: Workload[];
  
  // Map state
  mapState: MapState;
  
  // Actions
  setSelectedNodes: (nodeIds: string[]) => void;
  toggleNodeSelection: (nodeId: string) => void;
  setPointOfUse: (point: { lat: number; lon: number; address: string } | null) => void;
  setSelectedWorkload: (workloadId: string | null) => void;
  setFilters: (filters: AppState['filters']) => void;
  addUserGridSite: (node: Node) => void;
  removeUserGridSite: (nodeId: string) => void;
  setCompareMode: (mode: boolean) => void;
  setMapState: (state: Partial<MapState>) => void;
  setLatencyRingMode: (mode: { enabled: boolean; threshold: number; radiusMultiplier?: 1 | 2 }) => void;
  
  // Computed values
  getSelectedNodes: () => Node[];
  getSelectedWorkload: () => Workload | null;
  getFilteredNodes: () => Node[];
  getOnMapNodes: () => Node[];
  getOffMapNodes: () => Node[];
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      nodes: nodesData as Node[],
      workloads: workloadsData as Workload[],
      selectedNodes: [],
      pointOfUse: null,
      selectedWorkload: null,
      filters: {
        type: [],
        operator: [],
        vacancy: []
      },
      userGridSites: [],
      compareMode: false,
      latencyRingMode: {
        enabled: false,
        threshold: 10, // Default to 10ms
        radiusMultiplier: 1 // Default to Conservative
      },
      mapState: {
        center: [-96.7970, 32.7767], // DFW center
        zoom: 9,
        bearing: 0,
        pitch: 0
      },

      // Actions
      setSelectedNodes: (nodeIds) => set({ selectedNodes: nodeIds }),
      
      toggleNodeSelection: (nodeId) => {
        const { selectedNodes } = get();
        const newSelection = selectedNodes.includes(nodeId)
          ? selectedNodes.filter(id => id !== nodeId)
          : [...selectedNodes, nodeId];
        set({ selectedNodes: newSelection });
      },
      
      setPointOfUse: (point) => set({ pointOfUse: point }),
      
      setSelectedWorkload: (workloadId) => set({ selectedWorkload: workloadId }),
      
      setFilters: (filters) => set({ filters }),
      
      addUserGridSite: (node) => set((state) => ({ 
        userGridSites: [...state.userGridSites, node] 
      })),
      
      removeUserGridSite: (nodeId) => set((state) => ({
        userGridSites: state.userGridSites.filter(site => site.id !== nodeId),
        selectedNodes: state.selectedNodes.filter(id => id !== nodeId)
      })),
      
      setCompareMode: (mode) => set({ compareMode: mode }),
      
      setMapState: (newState) => set((state) => ({
        mapState: { ...state.mapState, ...newState }
      })),
      
      setLatencyRingMode: (mode) => set((state) => ({ 
        latencyRingMode: { 
          ...state.latencyRingMode, 
          ...mode,
          radiusMultiplier: mode.radiusMultiplier ?? state.latencyRingMode.radiusMultiplier
        } 
      })),

      // Computed values
      getSelectedNodes: () => {
        const { nodes, selectedNodes, userGridSites } = get();
        const allNodes = [...nodes, ...userGridSites];
        return allNodes.filter(node => selectedNodes.includes(node.id));
      },
      
      getSelectedWorkload: () => {
        const { workloads, selectedWorkload } = get();
        return selectedWorkload 
          ? workloads.find(w => w.id === selectedWorkload) || null
          : null;
      },
      
      getFilteredNodes: () => {
        const { nodes, filters, userGridSites } = get();
        const allNodes = [...nodes, ...userGridSites];
        
        return allNodes.filter(node => {
          if (filters.type.length > 0 && !filters.type.includes(node.type)) {
            return false;
          }
          if (filters.operator.length > 0 && !filters.operator.includes(node.operator)) {
            return false;
          }
          if (filters.vacancy.length > 0 && !filters.vacancy.includes(node.vacancy)) {
            return false;
          }
          return true;
        });
      },
      
      getOnMapNodes: () => {
        const { nodes } = get();
        return nodes.filter(node => node.lat !== undefined && node.lon !== undefined);
      },
      
      getOffMapNodes: () => {
        const { nodes } = get();
        return nodes.filter(node => node.lat === undefined || node.lon === undefined);
      }
    }),
    {
      name: 'metro-compute-overlay-storage',
      partialize: (state) => ({
        selectedNodes: state.selectedNodes,
        pointOfUse: state.pointOfUse,
        selectedWorkload: state.selectedWorkload,
        filters: state.filters,
        userGridSites: state.userGridSites,
        compareMode: state.compareMode,
        mapState: state.mapState,
        latencyRingMode: state.latencyRingMode
      })
    }
  )
);
