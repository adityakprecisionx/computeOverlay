#!/usr/bin/env python3
"""
Minify GeoJSON file by removing all unnecessary whitespace and line breaks
This significantly reduces file size while maintaining functionality
"""

import json
import sys
from pathlib import Path

def minify_geojson(input_path: str, output_path: str = None):
    """Minify a GeoJSON file by removing whitespace"""
    input_file = Path(input_path)
    
    if not input_file.exists():
        print(f"Error: File not found: {input_path}")
        return False
    
    if output_path is None:
        output_path = input_path
    
    print(f"Reading {input_file}...")
    print(f"  Original size: {input_file.stat().st_size / (1024*1024):.2f} MB")
    
    # Read the GeoJSON file
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    # Write minified version (no indentation, no spaces after separators)
    output_file = Path(output_path)
    with open(output_file, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    
    new_size = output_file.stat().st_size
    print(f"  Minified size: {new_size / (1024*1024):.2f} MB")
    print(f"  Reduction: {(1 - new_size / input_file.stat().st_size) * 100:.1f}%")
    
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 minify-geojson.py <input.geojson> [output.geojson]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    success = minify_geojson(input_file, output_file)
    sys.exit(0 if success else 1)

