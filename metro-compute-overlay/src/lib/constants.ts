export const LATENCY_CONSTANTS = {
  C_FIBER: 200_000, // km/s
  PATH_INEFFICIENCY: 1.2,
  PER_HOP_MS: {
    internet_gateway: 1.0,
    load_balancer: 1.2,
    tls_handshake: 0.8,
    vpc_routing: 0.6,
    ecs_eks_orchestration: 1.0,
    gpu_cold_start: 10.0,
    model_gpu_load: 4.0,
    queueing_multitenant: 1.5,
    noisy_neighbor: 0.8,
    data_retrieval: 2.0,
    longhaul_pop_or_xaz: 2.5,
    serverless_overhead: 1.3
  },
  EDGE_LOCAL_ROUTING_MS: 0.5
};

export const COST_DEFAULTS = {
  cloud: {
    gpu_hour_usd: 4.00,
    egress_per_gb_usd: 0.09,
    storage_per_gb_month: 0.021,
    network_services_month: 150,
    support_sla_month: 300,
    compliance_uplift_pct: 0.05
  },
  edge: {
    lease_usd_per_kw_month: 160,
    local_loop_month: 800,
    onprem_storage_hw_month: 300,
    ops_support_month: 500,
    sw_stack_orchestration_month: 400,
    compliance_month: 200,
    redundancy_pct: 0.15
  }
};

// DFW center coordinates
export const DFW_CENTER: [number, number] = [-96.7970, 32.7767];

// Mapbox configuration
export const MAPBOX_CONFIG = {
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
  style: 'mapbox://styles/mapbox/light-v11',
  center: DFW_CENTER,
  zoom: 9,
  minZoom: 0,  // Allow much more zoom out
  maxZoom: 18
};

// Latency radius configuration (based on metro area congestion and short latency)
export const LATENCY_RADIUS_CONFIG = {
  // RTT target (ms) -> radius in kilometers (converted from miles)
  5: 1.207,   // 5ms RTT = 0.75 mi = 1,207 m radius
  10: 3.218,  // 10ms RTT = 2 mi = 3,218 m radius
  15: 9.724,  // 15ms RTT = 6.04 mi = 9,724 m radius
  20: 28.163, // 20ms RTT = 17.5 mi = 28,163 m radius
  25: 56.327  // 25ms RTT = 35 mi = 56,327 m radius
};

// Latency radius colors (from fastest to slowest)
export const LATENCY_COLORS = {
  5: '#00ff00',   // Green - fastest
  10: '#ffff00',  // Yellow
  15: '#ffa500',  // Orange
  20: '#ff6600',  // Dark orange
  25: '#ff0000'   // Red - slowest
};
