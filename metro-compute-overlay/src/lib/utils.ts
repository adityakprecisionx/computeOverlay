import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency values
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format latency values
 */
export function formatLatency(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}μs`;
  }
  if (ms < 10) {
    return `${ms.toFixed(1)}ms`;
  }
  return `${ms.toFixed(0)}ms`;
}

/**
 * Format distance values
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${(km * 1000).toFixed(0)}m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)}km`;
  }
  return `${km.toFixed(0)}km`;
}

/**
 * Get node type color
 */
export function getNodeTypeColor(type: string): string {
  switch (type) {
    case 'colo':
      return 'bg-blue-500';
    case 'cloud':
      return 'bg-green-500';
    case 'gridsite':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get vacancy level color
 */
export function getVacancyColor(vacancy: string): string {
  switch (vacancy) {
    case 'low':
      return 'text-red-600';
    case 'medium':
      return 'text-yellow-600';
    case 'high':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
