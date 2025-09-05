import { LATENCY_CONSTANTS } from './constants';
import type { LatencyParams, EdgeLatencyParams } from './types';

/**
 * Calculate propagation delay based on distance
 * @param distanceKm Distance in kilometers
 * @returns Propagation delay in milliseconds
 */
function calcPropagationMs(distanceKm: number): number {
  const effectiveKm = distanceKm * LATENCY_CONSTANTS.PATH_INEFFICIENCY;
  return (effectiveKm / LATENCY_CONSTANTS.C_FIBER) * 1000;
}

/**
 * Calculate cloud latency with all hop delays
 * @param params Latency calculation parameters
 * @returns Total latency in milliseconds
 */
export function calcCloudLatency(params: LatencyParams): number {
  const { distanceKm, weights, inferenceMs } = params;
  const propRtt = calcPropagationMs(distanceKm) * 2;
  
  return propRtt
    + LATENCY_CONSTANTS.PER_HOP_MS.internet_gateway
    + LATENCY_CONSTANTS.PER_HOP_MS.load_balancer * weights.load_balancer
    + LATENCY_CONSTANTS.PER_HOP_MS.tls_handshake * weights.tls_handshake
    + LATENCY_CONSTANTS.PER_HOP_MS.vpc_routing
    + LATENCY_CONSTANTS.PER_HOP_MS.ecs_eks_orchestration * weights.ecs_eks_orchestration
    + LATENCY_CONSTANTS.PER_HOP_MS.gpu_cold_start * weights.gpu_cold_start
    + LATENCY_CONSTANTS.PER_HOP_MS.model_gpu_load * weights.model_gpu_load
    + LATENCY_CONSTANTS.PER_HOP_MS.queueing_multitenant * weights.queueing_multitenant
    + LATENCY_CONSTANTS.PER_HOP_MS.noisy_neighbor * weights.noisy_neighbor
    + LATENCY_CONSTANTS.PER_HOP_MS.data_retrieval * weights.data_retrieval
    + LATENCY_CONSTANTS.PER_HOP_MS.longhaul_pop_or_xaz * weights.longhaul_pop_or_xaz
    + LATENCY_CONSTANTS.PER_HOP_MS.serverless_overhead * weights.serverless_overhead
    + inferenceMs;
}

/**
 * Calculate edge latency (simplified for edge deployments)
 * @param params Edge latency calculation parameters
 * @returns Total latency in milliseconds
 */
export function calcEdgeLatency(params: EdgeLatencyParams): number {
  const { distanceKm, inferenceMs } = params;
  const propRtt = calcPropagationMs(distanceKm) * 2;
  
  return LATENCY_CONSTANTS.EDGE_LOCAL_ROUTING_MS + propRtt + inferenceMs;
}

/**
 * Calculate latency breakdown for detailed analysis
 * @param params Latency calculation parameters
 * @param isEdge Whether this is an edge deployment
 * @returns Detailed latency breakdown
 */
export function calcLatencyBreakdown(
  params: LatencyParams,
  isEdge: boolean = false
) {
  const { distanceKm, weights, inferenceMs } = params;
  const propRtt = calcPropagationMs(distanceKm) * 2;
  
  if (isEdge) {
    return {
      propagation: propRtt,
      edgeRouting: LATENCY_CONSTANTS.EDGE_LOCAL_ROUTING_MS,
      inference: inferenceMs,
      total: calcEdgeLatency({ distanceKm, inferenceMs })
    };
  }
  
  return {
    propagation: propRtt,
    internetGateway: LATENCY_CONSTANTS.PER_HOP_MS.internet_gateway,
    loadBalancer: LATENCY_CONSTANTS.PER_HOP_MS.load_balancer * weights.load_balancer,
    tlsHandshake: LATENCY_CONSTANTS.PER_HOP_MS.tls_handshake * weights.tls_handshake,
    vpcRouting: LATENCY_CONSTANTS.PER_HOP_MS.vpc_routing,
    orchestration: LATENCY_CONSTANTS.PER_HOP_MS.ecs_eks_orchestration * weights.ecs_eks_orchestration,
    gpuColdStart: LATENCY_CONSTANTS.PER_HOP_MS.gpu_cold_start * weights.gpu_cold_start,
    modelGpuLoad: LATENCY_CONSTANTS.PER_HOP_MS.model_gpu_load * weights.model_gpu_load,
    queueing: LATENCY_CONSTANTS.PER_HOP_MS.queueing_multitenant * weights.queueing_multitenant,
    noisyNeighbor: LATENCY_CONSTANTS.PER_HOP_MS.noisy_neighbor * weights.noisy_neighbor,
    dataRetrieval: LATENCY_CONSTANTS.PER_HOP_MS.data_retrieval * weights.data_retrieval,
    longhaul: LATENCY_CONSTANTS.PER_HOP_MS.longhaul_pop_or_xaz * weights.longhaul_pop_or_xaz,
    serverlessOverhead: LATENCY_CONSTANTS.PER_HOP_MS.serverless_overhead * weights.serverless_overhead,
    inference: inferenceMs,
    total: calcCloudLatency(params)
  };
}
