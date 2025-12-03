/**
 * Script to fetch and process real Texas power infrastructure data
 * 
 * Data Sources:
 * 1. EIA-860: Power plants (https://www.eia.gov/electricity/data/eia860/)
 * 2. HIFLD: Transmission lines (https://hifld-geoplatform.opendata.arcgis.com/)
 * 3. HIFLD: Substations (https://hifld-geoplatform.opendata.arcgis.com/)
 * 
 * This script downloads, processes, and converts data to our GeoJSON schema
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DATA_DIR = path.join(__dirname, '../public/data/power');
const TEXAS_BOUNDS = {
  west: -106.65,
  south: 25.84,
  east: -93.51,
  north: 36.5
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Download a file from URL
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        return downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

/**
 * Check if a point is within Texas bounds
 */
function isInTexas(lng, lat) {
  return lng >= TEXAS_BOUNDS.west && 
         lng <= TEXAS_BOUNDS.east && 
         lat >= TEXAS_BOUNDS.south && 
         lat <= TEXAS_BOUNDS.north;
}

/**
 * Fetch EIA power plant data for Texas
 * EIA-860 data is available as Excel/CSV files
 */
async function fetchEIAPowerPlants() {
  console.log('Fetching EIA power plant data...');
  
  // EIA-860 data is typically available as annual Excel files
  // For this script, we'll use a direct API approach or download the latest CSV
  // Note: EIA API requires registration, so we'll use a public CSV endpoint if available
  
  // Alternative: Use HIFLD power plants data which includes EIA data
  const hifldPlantsUrl = 'https://services1.arcgis.com/Hp6G80Pky0om7QvP/arcgis/rest/services/Electric_Power_Plants/FeatureServer/0/query?where=STATE%3D%27TX%27&outFields=*&f=geojson';
  
  try {
    const response = await fetch(hifldPlantsUrl);
    const data = await response.json();
    
    const features = data.features
      .filter(f => {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length !== 2) return false;
        return isInTexas(coords[0], coords[1]);
      })
      .map(f => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          plant_id: f.properties.PLANT_CODE || f.properties.OBJECTID?.toString() || `plant-${f.properties.OBJECTID}`,
          name: f.properties.PLANT_NAME || 'Unknown Plant',
          capacity_mw: parseFloat(f.properties.TOTAL_MW || f.properties.CAPACITY_MW || 0),
          fuel_primary: mapFuelType(f.properties.PRIM_FUEL || f.properties.FUEL_TYPE),
          status: f.properties.STATUS || 'operating',
          ercot_zone: f.properties.ERCOT_ZONE || null
        }
      }))
      .filter(f => f.properties.capacity_mw >= 1); // Only plants ≥ 1 MW
    
    const geojson = {
      type: 'FeatureCollection',
      features
    };
    
    fs.writeFileSync(
      path.join(DATA_DIR, 'tx_power_plants.geojson'),
      JSON.stringify(geojson, null, 2)
    );
    
    console.log(`✓ Saved ${features.length} power plants`);
    return geojson;
  } catch (error) {
    console.error('Error fetching power plants:', error);
    throw error;
  }
}

/**
 * Map fuel types to our schema
 */
function mapFuelType(fuel) {
  if (!fuel) return undefined;
  const fuelUpper = fuel.toUpperCase();
  if (fuelUpper.includes('GAS') || fuelUpper.includes('NATURAL')) return 'NG';
  if (fuelUpper.includes('WIND')) return 'WND';
  if (fuelUpper.includes('SOLAR')) return 'SOL';
  if (fuelUpper.includes('COAL')) return 'COL';
  if (fuelUpper.includes('NUCLEAR')) return 'NUC';
  if (fuelUpper.includes('HYDRO')) return 'HYD';
  return fuel.substring(0, 3).toUpperCase();
}

/**
 * Fetch HIFLD transmission lines for Texas
 */
async function fetchTransmissionLines() {
  console.log('Fetching transmission line data...');
  
  // HIFLD Electric Power Transmission Lines
  const hifldTransmissionUrl = 'https://services1.arcgis.com/Hp6G80Pky0om7QvP/arcgis/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0/query?where=STATE%3D%27TX%27&outFields=*&f=geojson';
  
  try {
    const response = await fetch(hifldTransmissionUrl);
    const data = await response.json();
    
    const features = data.features
      .filter(f => {
        // Filter for 138kV and 345kV lines
        const voltage = parseFloat(f.properties.VOLTAGE || f.properties.VOLTAGE_KV || 0);
        return (voltage === 138 || voltage === 345) && f.geometry;
      })
      .map(f => {
        // Ensure coordinates are in correct format
        let coords = f.geometry.coordinates;
        if (f.geometry.type === 'LineString' && Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
          // Already in correct format
        } else if (f.geometry.type === 'MultiLineString') {
          // Keep as is
        } else {
          console.warn('Unexpected geometry format:', f.geometry.type);
        }
        
        return {
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            id: f.properties.ID || f.properties.OBJECTID?.toString() || `line-${f.properties.OBJECTID}`,
            name: f.properties.NAME || f.properties.LINE_NAME || null,
            voltage_kv: parseFloat(f.properties.VOLTAGE || f.properties.VOLTAGE_KV || 0),
            status: f.properties.STATUS || 'existing',
            owner: f.properties.OWNER || f.properties.OPERATOR || null,
            ercot_zone: f.properties.ERCOT_ZONE || null
          }
        };
      });
    
    const geojson = {
      type: 'FeatureCollection',
      features
    };
    
    fs.writeFileSync(
      path.join(DATA_DIR, 'tx_transmission_138_345.geojson'),
      JSON.stringify(geojson, null, 2)
    );
    
    console.log(`✓ Saved ${features.length} transmission lines`);
    return geojson;
  } catch (error) {
    console.error('Error fetching transmission lines:', error);
    throw error;
  }
}

/**
 * Fetch HIFLD substations for Texas
 */
async function fetchSubstations() {
  console.log('Fetching substation data...');
  
  // HIFLD Electric Substations
  const hifldSubstationsUrl = 'https://services1.arcgis.com/Hp6G80Pky0om7QvP/arcgis/rest/services/Electric_Substations/FeatureServer/0/query?where=STATE%3D%27TX%27&outFields=*&f=geojson';
  
  try {
    const response = await fetch(hifldSubstationsUrl);
    const data = await response.json();
    
    const features = data.features
      .filter(f => {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length !== 2) return false;
        return isInTexas(coords[0], coords[1]);
      })
      .map(f => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          id: f.properties.ID || f.properties.OBJECTID?.toString() || `sub-${f.properties.OBJECTID}`,
          name: f.properties.NAME || f.properties.SUBSTATION_NAME || null,
          type: f.properties.TYPE || 'transmission',
          voltage_kv: parseFloat(f.properties.VOLTAGE || f.properties.VOLTAGE_KV || 0) || null,
          owner: f.properties.OWNER || f.properties.OPERATOR || null,
          ercot_zone: f.properties.ERCOT_ZONE || null
        }
      }));
    
    const geojson = {
      type: 'FeatureCollection',
      features
    };
    
    fs.writeFileSync(
      path.join(DATA_DIR, 'tx_substations.geojson'),
      JSON.stringify(geojson, null, 2)
    );
    
    console.log(`✓ Saved ${features.length} substations`);
    return geojson;
  } catch (error) {
    console.error('Error fetching substations:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting data fetch for Texas power infrastructure...\n');
  
  try {
    // Check if fetch is available (Node 18+)
    if (typeof fetch === 'undefined') {
      console.error('This script requires Node.js 18+ with native fetch support');
      console.error('Alternatively, install node-fetch: npm install node-fetch');
      process.exit(1);
    }
    
    await fetchEIAPowerPlants();
    await fetchTransmissionLines();
    await fetchSubstations();
    
    console.log('\n✓ All data fetched successfully!');
    console.log(`Data saved to: ${DATA_DIR}`);
  } catch (error) {
    console.error('\n✗ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { fetchEIAPowerPlants, fetchTransmissionLines, fetchSubstations };

