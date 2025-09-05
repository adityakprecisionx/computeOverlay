import { COST_DEFAULTS } from './constants';
import type { Node, Usage, CostFlags } from './types';

/**
 * Calculate cloud costs based on usage and workload flags
 * @param node Cloud node
 * @param usage Usage parameters
 * @param costFlags Cost flags from workload
 * @returns Monthly cost in USD
 */
export function calcCloudCost(node: Node, usage: Usage, costFlags: CostFlags): number {
  const gpuRate = node.pricing?.cloud_gpu_hour ?? COST_DEFAULTS.cloud.gpu_hour_usd;
  const egressRate = node.pricing?.egress_per_gb ?? COST_DEFAULTS.cloud.egress_per_gb_usd;
  
  // Base costs
  let subtotal = (gpuRate * usage.hours) + (egressRate * usage.egressGB)
    + (COST_DEFAULTS.cloud.storage_per_gb_month * usage.storageGB)
    + COST_DEFAULTS.cloud.network_services_month
    + COST_DEFAULTS.cloud.support_sla_month;
  
  // Apply compliance uplift if needed
  if (costFlags.strongCompliance) {
    subtotal += (COST_DEFAULTS.cloud.compliance_uplift_pct * subtotal);
  }
  
  return subtotal;
}

/**
 * Calculate edge/colo costs based on usage and workload flags
 * @param node Edge or colo node
 * @param usage Usage parameters
 * @param costFlags Cost flags from workload
 * @returns Monthly cost in USD
 */
export function calcEdgeCost(node: Node, usage: Usage, costFlags: CostFlags): number {
  const leaseRate = node.pricing?.usd_per_kw_month ?? COST_DEFAULTS.edge.lease_usd_per_kw_month;
  
  // Base costs
  let subtotal = (leaseRate * usage.kW) + COST_DEFAULTS.edge.local_loop_month
    + COST_DEFAULTS.edge.onprem_storage_hw_month
    + COST_DEFAULTS.edge.ops_support_month
    + COST_DEFAULTS.edge.sw_stack_orchestration_month;
  
  // Add compliance costs if needed
  if (costFlags.strongCompliance) {
    subtotal += COST_DEFAULTS.edge.compliance_month;
  }
  
  // Apply redundancy uplift
  subtotal += (COST_DEFAULTS.edge.redundancy_pct * subtotal);
  
  return subtotal;
}

/**
 * Calculate cost breakdown for detailed analysis
 * @param node Node to calculate costs for
 * @param usage Usage parameters
 * @param costFlags Cost flags from workload
 * @returns Detailed cost breakdown
 */
export function calcCostBreakdown(node: Node, usage: Usage, costFlags: CostFlags) {
  if (node.type === 'cloud') {
    const gpuRate = node.pricing?.cloud_gpu_hour ?? COST_DEFAULTS.cloud.gpu_hour_usd;
    const egressRate = node.pricing?.egress_per_gb ?? COST_DEFAULTS.cloud.egress_per_gb_usd;
    
    const gpuCost = gpuRate * usage.hours;
    const egressCost = egressRate * usage.egressGB;
    const storageCost = COST_DEFAULTS.cloud.storage_per_gb_month * usage.storageGB;
    const networkCost = COST_DEFAULTS.cloud.network_services_month;
    const supportCost = COST_DEFAULTS.cloud.support_sla_month;
    
    let subtotal = gpuCost + egressCost + storageCost + networkCost + supportCost;
    let complianceCost = 0;
    
    if (costFlags.strongCompliance) {
      complianceCost = COST_DEFAULTS.cloud.compliance_uplift_pct * subtotal;
      subtotal += complianceCost;
    }
    
    return {
      gpu: gpuCost,
      egress: egressCost,
      storage: storageCost,
      network: networkCost,
      support: supportCost,
      compliance: complianceCost,
      total: subtotal
    };
  } else {
    const leaseRate = node.pricing?.usd_per_kw_month ?? COST_DEFAULTS.edge.lease_usd_per_kw_month;
    
    const leaseCost = leaseRate * usage.kW;
    const loopCost = COST_DEFAULTS.edge.local_loop_month;
    const storageCost = COST_DEFAULTS.edge.onprem_storage_hw_month;
    const opsCost = COST_DEFAULTS.edge.ops_support_month;
    const swCost = COST_DEFAULTS.edge.sw_stack_orchestration_month;
    
    let subtotal = leaseCost + loopCost + storageCost + opsCost + swCost;
    let complianceCost = 0;
    
    if (costFlags.strongCompliance) {
      complianceCost = COST_DEFAULTS.edge.compliance_month;
      subtotal += complianceCost;
    }
    
    const redundancyCost = COST_DEFAULTS.edge.redundancy_pct * subtotal;
    subtotal += redundancyCost;
    
    return {
      lease: leaseCost,
      loop: loopCost,
      storage: storageCost,
      ops: opsCost,
      software: swCost,
      compliance: complianceCost,
      redundancy: redundancyCost,
      total: subtotal
    };
  }
}

/**
 * Get default usage based on workload flags
 * @param costFlags Cost flags from workload
 * @returns Default usage parameters
 */
export function getDefaultUsage(costFlags: CostFlags): Usage {
  return {
    hours: 730, // 24/7 usage
    egressGB: costFlags.highEgress ? 10000 : 1000, // 10TB vs 1TB
    storageGB: costFlags.needsHotStorage ? 5000 : 1000, // 5TB vs 1TB
    kW: 10 // 10kW rack
  };
}
