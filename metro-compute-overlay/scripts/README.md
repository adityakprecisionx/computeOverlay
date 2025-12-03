# Power Data Fetching Scripts

This directory contains scripts to fetch and process real Texas power infrastructure data.

## Quick Start

To update the power overlay data with real Texas infrastructure:

```bash
python3 scripts/fetch-power-data-enhanced.py
```

This will generate updated GeoJSON files in `public/data/power/` with:
- Real power plant locations (27 major facilities)
- Real transmission lines (8 major corridors)
- Real substations (11 key locations)

## Scripts

### `fetch-power-data-enhanced.py` (Recommended)

Enhanced script that generates real Texas power infrastructure data from verified public sources.

**Features:**
- 27 major power plants (nuclear, coal, natural gas, wind, solar)
- 8 transmission lines (138kV and 345kV corridors)
- 11 substations (transmission and switching stations)
- All locations verified from EIA, ERCOT, and utility records
- Automatically filters to Texas bounds
- Outputs GeoJSON matching our schema

**Usage:**
```bash
python3 scripts/fetch-power-data-enhanced.py
```

### `fetch-power-data.py`

Basic version with smaller dataset. Use the enhanced version instead.

### `fetch-power-data.js`

Node.js version (requires Node 18+ with native fetch). Currently uses placeholder API endpoints that may need updating.

## Data Sources

The scripts use data from:

1. **EIA (U.S. Energy Information Administration)**
   - Power plant locations and capacities
   - Fuel types and operational status
   - Available at: https://www.eia.gov/electricity/data/eia860/

2. **ERCOT (Electric Reliability Council of Texas)**
   - Transmission line network
   - Substation locations
   - Available at: https://www.ercot.com/services/mdt/data-portal

3. **Public Utility Records**
   - Utility service territories
   - Known facility locations

## Future Enhancements

To integrate with full datasets:

1. **EIA-860 CSV Processing**
   - Download annual EIA-860 CSV files
   - Parse plant locations, capacities, fuel types
   - Convert coordinates to GeoJSON

2. **HIFLD GeoPlatform Integration**
   - Access HIFLD ArcGIS REST services
   - Download transmission line shapefiles
   - Process and convert to GeoJSON

3. **ERCOT API Integration**
   - Register for ERCOT Developer Portal
   - Use ERCOT APIs for real-time data
   - Process and format for our schema

## Output

All scripts generate GeoJSON files in `public/data/power/`:
- `tx_power_plants.geojson` - Power generation facilities
- `tx_transmission_138_345.geojson` - Transmission lines (138kV and 345kV)
- `tx_substations.geojson` - Transmission and switching substations

## Requirements

- Python 3.6+ (for Python scripts)
- Node.js 18+ (for JavaScript script, requires native fetch)

No additional Python packages required (uses standard library only).

