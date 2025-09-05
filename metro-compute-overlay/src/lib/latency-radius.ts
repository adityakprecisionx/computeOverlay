import { LATENCY_RADIUS_CONFIG, LATENCY_COLORS } from './constants';

// Function to create a circle around a point with given radius in kilometers
export function createLatencyCircle(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  steps: number = 64
): GeoJSON.Polygon {
  const coordinates: [number, number][] = [];
  const earthRadius = 6371; // Earth's radius in kilometers
  
  for (let i = 0; i <= steps; i++) {
    const angle = (i * 2 * Math.PI) / steps;
    const lat1 = centerLat * (Math.PI / 180);
    const lon1 = centerLon * (Math.PI / 180);
    
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(radiusKm / earthRadius) +
      Math.cos(lat1) * Math.sin(radiusKm / earthRadius) * Math.cos(angle)
    );
    
    const lon2 = lon1 + Math.atan2(
      Math.sin(angle) * Math.sin(radiusKm / earthRadius) * Math.cos(lat1),
      Math.cos(radiusKm / earthRadius) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    coordinates.push([
      lon2 * (180 / Math.PI),
      lat2 * (180 / Math.PI)
    ]);
  }
  
  return {
    type: 'Polygon',
    coordinates: [coordinates]
  };
}

// Function to create all latency radius circles for a node
export function createLatencyRadiusCircles(
  nodeLat: number,
  nodeLon: number
): Array<{
  rtt: number;
  radius: number;
  color: string;
  geometry: GeoJSON.Polygon;
}> {
  const circles = [];
  
  for (const [rtt, radius] of Object.entries(LATENCY_RADIUS_CONFIG)) {
    const rttNum = parseInt(rtt);
    circles.push({
      rtt: rttNum,
      radius,
      color: LATENCY_COLORS[rttNum as keyof typeof LATENCY_COLORS],
      geometry: createLatencyCircle(nodeLat, nodeLon, radius)
    });
  }
  
  return circles;
}

// Function to create GeoJSON features for all latency circles
export function createLatencyRadiusFeatures(
  nodes: Array<{ lat: number; lon: number; id: string; name: string }>
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  nodes.forEach(node => {
    const circles = createLatencyRadiusCircles(node.lat, node.lon);
    
    circles.forEach(circle => {
      features.push({
        type: 'Feature',
        geometry: circle.geometry,
        properties: {
          id: `${node.id}-latency-${circle.rtt}`,
          nodeId: node.id,
          nodeName: node.name,
          rtt: circle.rtt,
          radius: circle.radius,
          color: circle.color,
          type: 'latency-radius'
        }
      });
    });
  });
  
  return {
    type: 'FeatureCollection',
    features
  };
}

// Function to create GeoJSON features for a specific latency threshold
export function createLatencyRingFeatures(
  nodes: Array<{ lat: number; lon: number; id: string; name: string }>,
  thresholdMs: number,
  radiusMultiplier: number = 1
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  // Get the radius for the specified threshold and apply multiplier
  const baseRadius = LATENCY_RADIUS_CONFIG[thresholdMs as keyof typeof LATENCY_RADIUS_CONFIG];
  const radius = baseRadius * radiusMultiplier;
  const color = LATENCY_COLORS[thresholdMs as keyof typeof LATENCY_COLORS];
  
  if (!baseRadius || !color) {
    return {
      type: 'FeatureCollection',
      features: []
    };
  }
  
  nodes.forEach(node => {
    const circle = createLatencyCircle(node.lat, node.lon, radius);
    
    features.push({
      type: 'Feature',
      geometry: circle,
      properties: {
        id: `${node.id}-latency-ring-${thresholdMs}`,
        nodeId: node.id,
        nodeName: node.name,
        rtt: thresholdMs,
        radius: radius,
        color: color,
        type: 'latency-ring'
      }
    });
  });
  
  return {
    type: 'FeatureCollection',
    features
  };
}
