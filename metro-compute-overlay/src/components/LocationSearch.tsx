'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface LocationSearchProps {
  onLocationSelect?: (location: { lat: number; lon: number; address: string; bbox?: [number, number, number, number] }) => void;
  placeholder?: string;
  className?: string;
}

interface GeocodeResult {
  place_name: string;
  center: [number, number];
  bbox?: [number, number, number, number];
  context?: Array<{
    id: string;
    text: string;
  }>;
}

export default function LocationSearch({ 
  onLocationSelect, 
  placeholder = "Search for a city, state, or country...",
  className = ""
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const { setMapState } = useAppStore();

  // Debounced search function
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await searchLocations(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
        `access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&` +
        `types=place,locality,neighborhood,address,country,region&` +
        `limit=8&` +
        `autocomplete=true`
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      setResults(data.features || []);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error searching locations:', error);
      setResults([]);
      // Show a user-friendly error message
      if (error instanceof Error && error.message.includes('access_token')) {
        console.warn('Mapbox access token not configured. Please set NEXT_PUBLIC_MAPBOX_TOKEN in your .env.local file');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (result: GeocodeResult) => {
    const [lon, lat] = result.center;
    const location = {
      lat,
      lon,
      address: result.place_name,
      bbox: result.bbox
    };

    // Update map state to fly to the location
    setMapState({
      center: [lon, lat],
      zoom: 10 // Adjust zoom level based on location type
    });

    // Call the callback if provided
    if (onLocationSelect) {
      onLocationSelect(location);
    }

    // Clear the search
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleLocationSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={resultsRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Searching...</span>
          </div>
        </div>
      )}

      {/* Search results dropdown */}
      {isOpen && results.length > 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
          {results.map((result, index) => (
            <button
              key={result.place_name}
              onClick={() => handleLocationSelect(result)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              } ${index === 0 ? 'rounded-t-lg' : ''} ${
                index === results.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {result.place_name}
                  </div>
                  {result.context && result.context.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {result.context
                        .filter(ctx => ctx.id.startsWith('country') || ctx.id.startsWith('region'))
                        .map(ctx => ctx.text)
                        .join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && results.length === 0 && !isLoading && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="text-center text-gray-500">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No locations found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try searching for a city, state, or country
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
