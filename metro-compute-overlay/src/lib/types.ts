export type NodeType = 'colo' | 'cloud' | 'gridsite';

export type VacancyLevel = 'unknown' | 'low' | 'medium' | 'high';

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  operator: string;
  address?: string;
  lat?: number;
  lon?: number;
  meta?: {
    power_capacity_mw?: number;
    notes?: string;
  };
  pricing?: {
    usd_per_kw_month?: number;
    rack_usd_month?: number;
    cloud_gpu_hour?: number;
    egress_per_gb?: number;
  };
  published_latency_endpoints?: string[];
  vacancy: VacancyLevel;
}

export interface LatencyWeights {
  load_balancer: number;
  tls_handshake: number;
  ecs_eks_orchestration: number;
  gpu_cold_start: number;
  model_gpu_load: number;
  queueing_multitenant: number;
  noisy_neighbor: number;
  data_retrieval: number;
  longhaul_pop_or_xaz: number;
  serverless_overhead: number;
}

export interface InferenceComputeMs {
  min: number;
  typ: number;
  max: number;
}

export interface CostFlags {
  needsHotStorage: boolean;
  strongCompliance: boolean;
  highEgress: boolean;
}

export interface Workload {
  id: string;
  name: string;
  latencyWeights: LatencyWeights;
  inference_compute_ms: InferenceComputeMs;
  costFlags: CostFlags;
  notes?: string;
}

export interface Usage {
  hours: number;
  egressGB: number;
  storageGB: number;
  kW: number;
}

export interface LatencyParams {
  distanceKm: number;
  weights: LatencyWeights;
  inferenceMs: number;
}

export interface EdgeLatencyParams {
  distanceKm: number;
  inferenceMs: number;
}

export interface AppState {
  selectedNodes: string[];
  pointOfUse: { lat: number; lon: number; address: string } | null;
  selectedWorkload: string | null;
  filters: {
    type: NodeType[];
    operator: string[];
    vacancy: VacancyLevel[];
  };
  userGridSites: Node[];
  compareMode: boolean;
  latencyRingMode: {
    enabled: boolean;
    threshold: number; // RTT threshold in ms
    radiusMultiplier: 1 | 2; // 1 = Conservative, 2 = Standard
  };
  powerOverlay: {
    enabled: boolean;
    subLayers: {
      transmission: boolean;
      substations: boolean;
      plants: boolean;
    };
  };
  showDataCenters: boolean;
}

export interface MapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}
