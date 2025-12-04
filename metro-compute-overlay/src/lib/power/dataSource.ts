/**
 * Power overlay data source configuration
 * 
 * This module defines the expected file paths and schemas for Texas power infrastructure data.
 * Data files should be placed in the public/data/power/ directory.
 * 
 * Data Sources:
 * - ERCOT: Transmission lines and substations
 * - EIA: Power plants (generation facilities)
 * - PUCT: Service territories (optional, for context)
 */

export type PowerLayerType = 'transmission' | 'substations' | 'plants';

export type PowerDataSourceType = 'geojson' | 'vector' | 'mbtiles';

export interface PowerSourceConfig {
  id: string;
  type: PowerDataSourceType;
  path: string; // Path relative to /public (e.g., '/data/power/file.geojson')
}

/**
 * Power data source configurations
 * Update these paths when refreshing data from ERCOT/EIA/PUCT
 */
export const powerDataSources: Record<PowerLayerType, PowerSourceConfig> = {
  transmission: {
    id: 'tx-transmission-138-345',
    type: 'geojson',
    path: '/data/power/tx_transmission_138_345.geojson',
  },
  substations: {
    id: 'tx-substations',
    type: 'geojson',
    path: '/data/power/tx_substations.geojson',
  },
  plants: {
    id: 'tx-power-plants',
    type: 'geojson',
    path: '/data/power/tx_power_plants.geojson',
  },
} as const;

/**
 * Texas/ERCOT bounding box
 * Used for optional fitBounds behavior when enabling the power overlay
 */
export const TEXAS_BOUNDS: [number, number, number, number] = [
  -106.65, // west
  25.84,   // south
  -93.51,  // east
  36.5     // north
];

/**
 * Expected GeoJSON schema for transmission lines
 */
export interface TransmissionLineProperties {
  id: string;
  transmission_line_id?: string;
  voltage_kv: number; // e.g., 138, 345
  voltage?: number;   // For display
  status?: string;   // e.g., 'IN SERVICE', 'Not Available'
  owner?: string;
  type?: string;     // e.g., 'OVERHEAD', 'UNDERGROUND'
  inferred?: string; // e.g., 'Yes', 'No'
  substation_1?: string;
  substation_2?: string;
  naics_code?: string;
  naics_desc?: string;
}

/**
 * Expected GeoJSON schema for substations
 */
export interface SubstationProperties {
  id: string;
  name?: string;
  type?: string;      // e.g., 'transmission', 'switching', 'load'
  voltage_kv?: number;
  owner?: string;
  ercot_zone?: string;
}

/**
 * Expected GeoJSON schema for power plants
 */
export interface PowerPlantProperties {
  plant_id: string;
  name: string;
  capacity_mw: number;
  fuel_primary?: string; // e.g., 'NG', 'WND', 'SOL', 'COL', 'NUC'
  status?: string;       // e.g., 'operating', 'retired'
  ercot_zone?: string;
}

