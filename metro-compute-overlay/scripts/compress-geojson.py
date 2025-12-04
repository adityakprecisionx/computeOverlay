#!/usr/bin/env python3
"""
Compress GeoJSON file by:
1. Removing whitespace (minification)
2. Reducing coordinate precision (rounding to 6 decimal places ~10cm accuracy)
"""

import json
import sys
from pathlib import Path

def round_coordinates(coords, precision=6):
    """Recursively round coordinates to specified precision"""
    if isinstance(coords, (list, tuple)):
        if len(coords) == 2 and isinstance(coords[0], (int, float)):
            # This is a coordinate pair [lng, lat]
            return [round(coords[0], precision), round(coords[1], precision)]
        else:
            # Recursively process nested arrays
            return [round_coordinates(c, precision) for c in coords]
    return coords

def compress_geojson(input_path: str, output_path: str = None, precision: int = 6):
    """Compress a GeoJSON file by minifying and reducing coordinate precision"""
    input_file = Path(input_path)
    
    if not input_file.exists():
        print(f"Error: File not found: {input_path}")
        return False
    
    if output_path is None:
        output_path = input_path
    
    print(f"Reading {input_file}...")
    original_size = input_file.stat().st_size
    print(f"  Original size: {original_size / (1024*1024):.2f} MB")
    
    # Read the GeoJSON file
    print("  Loading JSON...")
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    print("  Compressing coordinates (precision={})...".format(precision))
    # Compress coordinates in all features
    if 'features' in data:
        for i, feature in enumerate(data['features']):
            if i % 10000 == 0:
                print(f"    Processing feature {i}/{len(data['features'])}...")
            
            if 'geometry' in feature and 'coordinates' in feature['geometry']:
                feature['geometry']['coordinates'] = round_coordinates(
                    feature['geometry']['coordinates'], 
                    precision
                )
    
    # Write minified version (no indentation, no spaces after separators)
    output_file = Path(output_path)
    print(f"  Writing compressed file to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    
    new_size = output_file.stat().st_size
    print(f"  Compressed size: {new_size / (1024*1024):.2f} MB")
    print(f"  Reduction: {(1 - new_size / original_size) * 100:.1f}%")
    
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 compress-geojson.py <input.geojson> [output.geojson] [precision]")
        print("  precision: number of decimal places (default: 6, ~10cm accuracy)")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    precision = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    
    success = compress_geojson(input_file, output_file, precision)
    sys.exit(0 if success else 1)

