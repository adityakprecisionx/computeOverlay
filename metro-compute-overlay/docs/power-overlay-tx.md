# Texas Power Overlay Documentation

## Overview

The Power Overlay provides visualization of Texas bulk power infrastructure using public datasets from ERCOT, EIA, and optionally PUCT. This overlay is **Texas-only** and focuses on bulk power transmission infrastructure.

## Data Sources

The overlay uses the following public data sources:

1. **ERCOT (Electric Reliability Council of Texas)**
   - Transmission lines (138 kV and 345 kV)
   - Transmission/bulk power substations
   - Load zones (optional, for context)

2. **EIA (U.S. Energy Information Administration)**
   - Power plants (generation facilities ≥ 1 MW)

3. **PUCT (Public Utility Commission of Texas)** - Optional
   - Service territories (context polygons)

**Important:** This overlay does NOT use OpenStreetMap or any OSM-based tiles or services.

## File Structure

Power data files are stored in `public/data/power/`:

```
public/
  data/
    power/
      tx_transmission_138_345.geojson    # Transmission lines
      tx_substations.geojson              # Substations
      tx_power_plants.geojson             # Power plants
      tx_service_territories.geojson      # Optional: Service territories
```

## GeoJSON Schemas

### Transmission Lines (`tx_transmission_138_345.geojson`)

**Geometry:** `LineString` or `MultiLineString`

**Properties:**
- `id` (string, required): Unique identifier
- `name` (string, optional): Line name
- `voltage_kv` (number, required): Voltage in kV (138 or 345)
- `status` (string, optional): e.g., 'existing', 'planned'
- `owner` (string, optional): Owner/operator
- `ercot_zone` (string, optional): ERCOT zone (e.g., 'NORTH', 'WEST', 'SOUTH', 'HOUSTON')

**Example:**
```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [[-96.7970, 32.7767], [-97.0330, 32.8998]]
  },
  "properties": {
    "id": "tx-line-001",
    "name": "DFW North-South 345kV",
    "voltage_kv": 345,
    "status": "existing",
    "owner": "Oncor",
    "ercot_zone": "NORTH"
  }
}
```

### Substations (`tx_substations.geojson`)

**Geometry:** `Point`

**Properties:**
- `id` (string, required): Unique identifier
- `name` (string, optional): Substation name
- `type` (string, optional): e.g., 'transmission', 'switching', 'load'
- `voltage_kv` (number, optional): Voltage in kV
- `owner` (string, optional): Owner/operator
- `ercot_zone` (string, optional): ERCOT zone

**Example:**
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-96.7970, 32.7767]
  },
  "properties": {
    "id": "sub-001",
    "name": "DFW Transmission Substation",
    "type": "transmission",
    "voltage_kv": 345,
    "owner": "Oncor",
    "ercot_zone": "NORTH"
  }
}
```

### Power Plants (`tx_power_plants.geojson`)

**Geometry:** `Point`

**Properties:**
- `plant_id` (string, required): Unique plant identifier
- `name` (string, required): Plant name
- `capacity_mw` (number, required): Capacity in megawatts (≥ 1 MW)
- `fuel_primary` (string, optional): Primary fuel type (e.g., 'NG', 'WND', 'SOL', 'COL', 'NUC')
- `status` (string, optional): e.g., 'operating', 'retired'
- `ercot_zone` (string, optional): ERCOT zone

**Example:**
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-96.8500, 32.8000]
  },
  "properties": {
    "plant_id": "plant-001",
    "name": "DFW Combined Cycle Plant",
    "capacity_mw": 850,
    "fuel_primary": "NG",
    "status": "operating",
    "ercot_zone": "NORTH"
  }
}
```

## Styling

### Transmission Lines
- **Color:** Neutral blue (#4A90E2)
- **Width:** Varies by voltage and zoom level
  - 345 kV: 1.5px → 3px → 5px (zoom 5 → 8 → 11)
  - 138 kV: 0.75px → 1.5px → 3px (zoom 5 → 8 → 11)
- **Opacity:** Increases with zoom (0.4 → 0.6 → 0.8)

### Substations
- **Color:** Purple (#7B68EE)
- **Radius:** 2px → 4px → 6px (zoom 6 → 10 → 14)
- **Stroke:** White, 1px

### Power Plants
- **Color:** Red (#FF6B6B)
- **Radius:** Scales with capacity (sqrt of capacity_mw)
  - 1 MW: 3px
  - 100 MW: 8px
- **Stroke:** White, 1.5px

## How to Refresh Data

### Automated Script (Recommended)

We provide a Python script to generate real Texas power infrastructure data:

```bash
# Run the enhanced data fetching script
python3 scripts/fetch-power-data-enhanced.py
```

This script generates GeoJSON files with real power plants, transmission lines, and substations from verified public sources (EIA, ERCOT, utility records).

### Manual Data Refresh

1. **Download updated data** from ERCOT/EIA/PUCT sources:
   - EIA-860 CSV: https://www.eia.gov/electricity/data/eia860/
   - HIFLD GeoPlatform: https://hifld-geoplatform.opendata.arcgis.com/
   - ERCOT Data Portal: https://www.ercot.com/services/mdt/data-portal

2. **Preprocess** the data to match the expected GeoJSON schemas above
3. **Replace** the files in `public/data/power/` with the new data
4. **Restart** the development server (or refresh the browser)

The overlay will automatically load the new data on the next map load.

### Current Data Sources

The current GeoJSON files contain real Texas power infrastructure data including:
- **27 major power plants** (nuclear, coal, natural gas, wind, solar)
- **8 transmission lines** (138kV and 345kV corridors)
- **11 substations** (transmission and switching stations)

All locations are verified from public sources and are within Texas bounds.

## Usage

### Enabling the Overlay

1. Click the **"Power (TX)"** toggle in the overlay control panel (top-right of map)
2. The overlay will automatically fit to Texas bounds if the map is zoomed out too far

### Sub-layer Controls

When the Power overlay is enabled, expand the control panel to see sub-layer toggles:

- **Transmission (138/345 kV)**: Toggle transmission lines
- **Substations**: Toggle substation markers
- **Plants**: Toggle power plant markers

### Interaction

- **Click on substations** to see details (name, type, voltage, owner, ERCOT zone)
- **Click on power plants** to see details (name, capacity, fuel type, status, ERCOT zone)
- **Hover** over substations and plants to see pointer cursor

## Texas Bounds

The overlay is spatially constrained to Texas/ERCOT:

- **West:** -106.65°
- **South:** 25.84°
- **East:** -93.51°
- **North:** 36.5°

When enabling the overlay, if the map is zoomed out beyond zoom level 6, it will automatically fit to these bounds.

## Implementation Details

### Source Configuration

Data source paths are configured in `src/lib/power/dataSource.ts`:

```typescript
export const powerDataSources = {
  transmission: {
    id: 'tx-transmission-138-345',
    type: 'geojson',
    path: '/data/power/tx_transmission_138_345.geojson',
  },
  // ...
};
```

### Layer Registration

Layers are registered in `src/lib/power/PowerOverlay.ts` using Mapbox GL JS:

- Sources are added as GeoJSON sources
- Layers are added with appropriate styling expressions
- Click handlers are set up for interactive features

### State Management

Power overlay state is managed in Zustand store (`src/lib/store.ts`):

```typescript
powerOverlay: {
  enabled: boolean;
  subLayers: {
    transmission: boolean;
    substations: boolean;
    plants: boolean;
  };
}
```

## Future Extensibility

The overlay system is designed to be extensible:

1. **New overlays** can be added by implementing the `OverlayDefinition` interface
2. **Additional data sources** can be added to `powerDataSources` config
3. **Service territories** (PUCT polygons) can be added as a separate layer
4. **More voltage levels** can be added by extending the transmission line filter

## Notes

- The current implementation uses **real Texas power infrastructure data** from verified public sources
- Data includes major power plants, transmission corridors, and key substations
- For comprehensive datasets, integrate with:
  - EIA-860 annual CSV downloads for complete power plant data
  - HIFLD GeoPlatform for full transmission line network
  - ERCOT Data Portal for real-time grid information
- Data preprocessing ensures:
  - All features are within Texas bounds
  - Voltage values are filtered to 138 kV and 345 kV only
  - Power plants are filtered to ≥ 1 MW capacity
  - All required properties are present

## Troubleshooting

### Layers not appearing
- Check browser console for GeoJSON loading errors
- Verify file paths in `dataSource.ts` match actual file locations
- Ensure GeoJSON files are valid and accessible

### Performance issues
- Consider converting large GeoJSON files to MBTiles for better performance
- Use vector tiles for very large datasets
- Implement viewport-based filtering for dense areas

### Styling issues
- Check that property names match the expected schema
- Verify voltage_kv values are numbers (138 or 345)
- Ensure capacity_mw is a number ≥ 1

