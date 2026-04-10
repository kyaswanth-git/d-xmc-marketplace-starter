'use client';

import { useState, useRef } from 'react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface SearchBoxProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

// Check if a string looks like coordinates e.g. "51.5074, -0.1278" or "51.5074 -0.1278"
function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const cleaned = input.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  const parts = cleaned.split(' ');
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
    }
  }
  return null;
}

export default function SearchBox({ onLocationSelect }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Check if input is lat/lng coordinates
    const coords = parseCoordinates(trimmed);
    if (coords) {
      onLocationSelect(coords.lat, coords.lng, `${coords.lat}, ${coords.lng}`);
      setShowDropdown(false);
      setResults([]);
      return;
    }

    setIsSearching(true);
    setNoResults(false);
    setShowDropdown(true);
    setResults([]);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'SitecoreMapPickerApp/1.0',
          },
        }
      );
      const data: NominatimResult[] = await res.json();
      const top5 = data.slice(0, 5);
      setResults(top5);
      setNoResults(top5.length === 0);
    } catch {
      setResults([]);
      setNoResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelect = (result: NominatimResult) => {
    const lat = parseFloat(parseFloat(result.lat).toFixed(6));
    const lng = parseFloat(parseFloat(result.lon).toFixed(6));
    onLocationSelect(lat, lng, result.display_name);
    setQuery(result.display_name);
    setShowDropdown(false);
    setResults([]);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', padding: '8px 0' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a place or enter lat, lng..."
          style={inputStyle}
        />
        <button onClick={handleSearch} style={searchBtnStyle} type="button">
          🔍
        </button>
      </div>

      {showDropdown && (
        <div style={dropdownStyle}>
          {isSearching && <div style={dropdownItemStyle}>Searching...</div>}
          {noResults && !isSearching && (
            <div style={dropdownItemStyle}>No results found</div>
          )}
          {results.map((r) => (
            <div
              key={r.place_id}
              style={dropdownItemClickableStyle}
              onClick={() => handleSelect(r)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#fff';
              }}
            >
              {r.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 10px',
  fontSize: '0.875rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  outline: 'none',
  fontFamily: 'sans-serif',
};

const searchBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  border: '1px solid #ccc',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: '1.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 48,
  minHeight: 40,
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: 1000,
  background: '#fff',
  border: '1px solid #ccc',
  borderTop: 'none',
  borderRadius: '0 0 4px 4px',
  maxHeight: 200,
  overflowY: 'auto',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
};

const dropdownItemStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: '0.8rem',
  color: '#666',
  fontFamily: 'sans-serif',
};

const dropdownItemClickableStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: '0.8rem',
  cursor: 'pointer',
  borderBottom: '1px solid #eee',
  fontFamily: 'sans-serif',
};
