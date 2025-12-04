#!/usr/bin/env python3
"""
Fetch real transmission line data from ArcGIS Online HIFLD service

Source: https://www.arcgis.com/home/item.html?id=d4090758322c4d32a4cd002ffaa0aa12
Service: U.S. Electric Power Transmission Lines (Archive)
Last Updated: 09/30/2024

This script queries the ArcGIS REST service for ALL US transmission lines
(all voltage levels) and converts them to our GeoJSON schema.
Uses ObjectID-based pagination to bypass the 100k resultOffset limit.
"""

import json
import urllib.request
import urllib.parse
import re
from pathlib import Path
from typing import List, Dict, Any

# ArcGIS service URL
SERVICE_URL = "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/US_Electric_Power_Transmission_Lines/FeatureServer/0"

DATA_DIR = Path(__file__).parent.parent / 'public' / 'data' / 'power'
DATA_DIR.mkdir(parents=True, exist_ok=True)

def fetch_all_object_ids(where_clause: str = "1=1") -> List[int]:
    """
    Fetch all ObjectIDs from the service using returnIdsOnly (no offset limit)
    This bypasses the ~100k resultOffset limit
    """
    print(f"Step 1a: Fetching all ObjectIDs...")
    print(f"Filter: {where_clause}")
    
    params = {
        'where': where_clause,
        'returnIdsOnly': 'true',
        'f': 'json'
    }
    
    url = f"{SERVICE_URL}/query?" + urllib.parse.urlencode(params)
    
    try:
        with urllib.request.urlopen(url, timeout=120) as response:
            data = json.loads(response.read())
            
            if 'error' in data:
                print(f"Error: {data['error']}")
                return []
            
            object_ids = data.get('objectIds', [])
            print(f"✓ Found {len(object_ids)} total ObjectIDs")
            return object_ids
            
    except Exception as e:
        print(f"Error fetching ObjectIDs: {e}")
        return []


def fetch_features_by_ids(object_ids: List[int], batch_size: int = 1000) -> List[Dict]:
    """
    Fetch features by ObjectIDs in batches using POST requests
    This allows us to fetch all records without hitting the offset limit
    """
    all_features = []
    total_batches = (len(object_ids) + batch_size - 1) // batch_size
    
    print(f"Step 1b: Fetching features in {total_batches} batches...")
    
    for i in range(0, len(object_ids), batch_size):
        batch_ids = object_ids[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        
        # Use POST request with objectIds in the request body
        url = f"{SERVICE_URL}/query"
        
        # Prepare POST data
        post_data = {
            'objectIds': batch_ids,
            'outFields': 'OBJECTID,ID,TYPE,STATUS,OWNER,VOLTAGE,VOLT_CLASS,SUB_1,SUB_2,NAICS_CODE,NAICS_DESC,INFERRED',
            'outSR': {'wkid': 4326},  # WGS84
            'returnGeometry': True,
            'f': 'geojson'
        }
        
        # Convert to JSON and encode
        json_data = json.dumps(post_data).encode('utf-8')
        
        try:
            req = urllib.request.Request(url, data=json_data, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=120) as response:
                data = json.loads(response.read())
                
                if 'error' in data:
                    print(f"  Error in batch {batch_num}: {data['error']}")
                    continue
                
                features = data.get('features', [])
                all_features.extend(features)
                print(f"  Batch {batch_num}/{total_batches}: Fetched {len(features)} features (total: {len(all_features)})...")
                
        except Exception as e:
            print(f"  Error in batch {batch_num}: {e}")
            continue
    
    return all_features


def fetch_all_features(where_clause: str = "1=1", max_records: int = None) -> List[Dict]:
    """
    Fetch all features from ArcGIS service using ORDER BY with OBJECTID ranges
    This bypasses the ~100k resultOffset limit by using WHERE clauses with OBJECTID ranges
    """
    all_features = []
    batch_size = 2000  # Service limits to 2000 per request, so use that as our range size
    current_min_id = 1
    max_id = None
    
    print(f"Step 1a: Determining OBJECTID range...")
    
    # First, get the max OBJECTID to know the range
    params = {
        'where': where_clause,
        'outStatistics': json.dumps([{
            'statisticType': 'max',
            'onStatisticField': 'OBJECTID',
            'outStatisticFieldName': 'MAX_OBJECTID'
        }]),
        'f': 'json'
    }
    
    url = f"{SERVICE_URL}/query?" + urllib.parse.urlencode(params)
    
    try:
        with urllib.request.urlopen(url, timeout=60) as response:
            data = json.loads(response.read())
            if 'features' in data and len(data['features']) > 0:
                max_id = data['features'][0]['attributes']['MAX_OBJECTID']
                print(f"✓ Found max OBJECTID: {max_id}")
    except Exception as e:
        print(f"Could not determine max OBJECTID, will fetch until no more results: {e}")
    
    print(f"Step 1b: Fetching features in batches using OBJECTID ranges...")
    batch_num = 0
    consecutive_empty_batches = 0
    max_empty_batches = 200  # Stop after 200 consecutive empty batches (to handle large gaps)
    
    while True:
        batch_num += 1
        current_max_id = current_min_id + batch_size - 1
        
        # Use WHERE clause with OBJECTID range
        # Continue until we've passed the max OBJECTID
        if max_id and current_min_id > max_id + batch_size:
            print(f"  Reached max OBJECTID ({max_id}), stopping.")
            break
            
        range_where = f"{where_clause} AND OBJECTID >= {current_min_id} AND OBJECTID <= {current_max_id}"
        
        params = {
            'where': range_where,
            'outFields': 'OBJECTID,ID,TYPE,STATUS,OWNER,VOLTAGE,VOLT_CLASS,SUB_1,SUB_2,NAICS_CODE,NAICS_DESC,INFERRED',
            'outSR': '4326',  # WGS84
            'returnGeometry': 'true',
            'orderByFields': 'OBJECTID',
            'f': 'geojson',
            'resultRecordCount': batch_size
        }
        
        url = f"{SERVICE_URL}/query?" + urllib.parse.urlencode(params)
        
        try:
            with urllib.request.urlopen(url, timeout=120) as response:
                data = json.loads(response.read())
                
                if 'error' in data:
                    print(f"  Error in batch {batch_num}: {data['error']}")
                    consecutive_empty_batches += 1
                    if consecutive_empty_batches >= max_empty_batches:
                        break
                    current_min_id = current_max_id + 1
                    continue
                
                features = data.get('features', [])
                
                if not features:
                    consecutive_empty_batches += 1
                    if consecutive_empty_batches >= max_empty_batches:
                        print(f"  No more features found after {max_empty_batches} empty batches. Stopping.")
                        break
                    # Move to next range even if empty (there might be gaps)
                    current_min_id = current_max_id + 1
                    continue
                
                # Reset empty batch counter
                consecutive_empty_batches = 0
                
                all_features.extend(features)
                
                # Get the actual max OBJECTID from this batch to handle non-sequential IDs
                if features:
                    actual_max_id_in_batch = max(f.get('properties', {}).get('OBJECTID', current_max_id) for f in features)
                    print(f"  Batch {batch_num}: Fetched {len(features)} features (OBJECTID range {current_min_id}-{current_max_id}, actual max: {actual_max_id_in_batch}, total: {len(all_features)})...")
                else:
                    print(f"  Batch {batch_num}: No features in range {current_min_id}-{current_max_id}...")
                
                # Check if we've reached the limit
                if max_records and len(all_features) >= max_records:
                    all_features = all_features[:max_records]
                    break
                
                # Move to next range
                # If we got exactly batch_size results, there might be more in this range
                # But we'll move to next range anyway and let empty batches handle gaps
                current_min_id = current_max_id + 1
                
                # If we got exactly 0 features, increment empty batch counter
                if len(features) == 0:
                    consecutive_empty_batches += 1
                else:
                    consecutive_empty_batches = 0
                        
        except Exception as e:
            print(f"  Error in batch {batch_num}: {e}")
            consecutive_empty_batches += 1
            if consecutive_empty_batches >= max_empty_batches:
                break
            # Try next range
            current_min_id = current_max_id + 1
            continue
    
    return all_features

# No longer filtering to Texas - keeping all US features

def convert_to_our_schema(features: List[Dict]) -> Dict:
    """Convert ArcGIS features to our GeoJSON schema"""
    converted_features = []
    
    for i, feature in enumerate(features):
        props = feature.get('properties', {})
        geometry = feature.get('geometry')
        
        # Extract voltage - keep ALL voltage levels
        voltage = props.get('VOLTAGE')
        if voltage and voltage != -999999:  # -999999 means unknown
            voltage_int = int(voltage)
        else:
            # Try VOLT_CLASS as fallback - extract first numeric value
            volt_class = props.get('VOLT_CLASS', '').upper()
            # Try to extract voltage from VOLT_CLASS (e.g., "345KV" -> 345)
            volt_match = re.search(r'(\d+)', volt_class)
            if volt_match:
                voltage_int = int(volt_match.group(1))
            else:
                # If we can't determine voltage, set to 0 (will be categorized as "other")
                voltage_int = 0
        
        # Convert geometry coordinates if needed
        coords = geometry.get('coordinates', [])
        if not coords:
            continue
        
        # Ensure coordinates are in [lng, lat] format
        if geometry.get('type') == 'LineString':
            # Verify coordinate format
            if len(coords) > 0 and len(coords[0]) == 2:
                # Already in correct format
                pass
            else:
                continue
        elif geometry.get('type') == 'MultiLineString':
            # Verify format
            if len(coords) > 0 and len(coords[0]) > 0 and len(coords[0][0]) == 2:
                pass
            else:
                continue
                
        converted_feature = {
            'type': 'Feature',
            'geometry': geometry,
            'properties': {
                'id': props.get('ID') or props.get('OBJECTID', f"line-{i+1:06d}"),
                'transmission_line_id': props.get('ID') or props.get('OBJECTID', f"line-{i+1:06d}"),
                'voltage_kv': voltage_int,
                'voltage': voltage_int,  # For display
                'owner': props.get('OWNER') or 'Not Available',
                'status': props.get('STATUS') or 'Not Available',
                'type': props.get('TYPE') or 'Not Available',
                'inferred': props.get('INFERRED') or 'No',
                'substation_1': props.get('SUB_1') or 'Not Available',
                'substation_2': props.get('SUB_2') or 'Not Available',
                'naics_code': props.get('NAICS_CODE') or 'Not Available',
                'naics_desc': props.get('NAICS_DESC') or 'Not Available',
            }
        }
        
        converted_features.append(converted_feature)
    
    return {
        'type': 'FeatureCollection',
        'features': converted_features
    }

def main():
    print("=" * 60)
    print("Fetching ALL US Transmission Lines from ArcGIS HIFLD")
    print("=" * 60)
    print()
    
    # Fetch ALL transmission lines for entire US (all 400k+ entries)
    print("Step 1: Fetching ALL transmission lines for entire US...")
    print("Using ObjectID-based pagination to bypass 100k offset limit...")
    print()
    
    # Query for ALL lines (no voltage filter)
    where_clause = "1=1"
    
    all_features = fetch_all_features(where_clause=where_clause)
    print(f"\n✓ Fetched {len(all_features)} total features")
    
    # Convert to our schema (no spatial filtering - keeping all US)
    print("\nStep 2: Converting to our schema...")
    geojson = convert_to_our_schema(all_features)
    print(f"✓ Converted {len(geojson['features'])} transmission lines")
    
    # Save to file
    output_file = DATA_DIR / 'tx_transmission_138_345.geojson'
    with open(output_file, 'w') as f:
        json.dump(geojson, f, indent=2)
    
    print(f"\n✓ Saved to {output_file}")
    print(f"\nSummary:")
    print(f"  - Total features: {len(geojson['features'])}")
    
    # Count by voltage
    voltage_counts = {}
    for feature in geojson['features']:
        voltage = feature['properties']['voltage_kv']
        voltage_counts[voltage] = voltage_counts.get(voltage, 0) + 1
    
    for voltage, count in sorted(voltage_counts.items()):
        print(f"  - {voltage}kV lines: {count}")
    
    print(f"\n  File size: {output_file.stat().st_size / (1024*1024):.1f} MB")
    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)

if __name__ == '__main__':
    main()

