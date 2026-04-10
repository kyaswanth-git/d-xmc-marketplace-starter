'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useMarketplaceClient } from '@/src/utils/hooks/useMarketplaceClient';
import SearchBox from '@/src/components/map-picker/SearchBox';
import LocationList from '@/src/components/map-picker/LocationList';
import type { Location, MapData } from '@/src/components/map-picker/types';

// Global style tag for italic placeholder on label input
const placeholderStyle = `
  .label-input::placeholder {
    font-style: italic;
    color: #999;
  }
  .label-input::-webkit-input-placeholder {
    font-style: italic;
    color: #999;
  }
`;

const MapView = dynamic(() => import('@/src/components/map-picker/MapView'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      Loading map...
    </div>
  ),
});

const DEFAULT_CENTER = { lat: 20, lng: 0 };
const DEFAULT_ZOOM = 2;

export default function MapPickerField() {
  const { client, isInitialized, isLoading, error } = useMarketplaceClient();
  const topRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Map state
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  // Marker + inputs
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [addressInput, setAddressInput] = useState('');

  // Locations list
  const [locations, setLocations] = useState<Location[]>([]);

  // Edit mode
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<{ lat?: string; lng?: string; label?: string }>({});

  // Click-outside handler to exit edit mode
  useEffect(() => {
    if (!editingLocationId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setEditingLocationId(null);
        setMarkerPosition(null);
        setLatInput('');
        setLngInput('');
        setLabelInput('');
        setAddressInput('');
        setErrors({});
        setFlyTo(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingLocationId]);

  // Load saved data on init
  useEffect(() => {
    if (!client || !isInitialized) return;
    const loadValue = async () => {
      try {
        const existing = await client.getValue();
        if (existing && typeof existing === 'string') {
          const parsed: MapData = JSON.parse(existing);
          if (parsed.locations && Array.isArray(parsed.locations)) {
            setLocations(parsed.locations);
          }
          if (parsed.mapCenter) {
            setMapCenter(parsed.mapCenter);
          }
          if (parsed.defaultZoom) {
            setMapZoom(parsed.defaultZoom);
          }
        }
      } catch {
        // No valid saved data, start fresh
      }
    };
    loadValue();
  }, [client, isInitialized]);

  // Map click handler
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setMarkerPosition({ lat, lng });
    setLatInput(lat.toString());
    setLngInput(lng.toString());
    setErrors({});
  }, []);

  // Marker drag handler
  const handleMarkerDrag = useCallback((lat: number, lng: number) => {
    setMarkerPosition({ lat, lng });
    setLatInput(lat.toString());
    setLngInput(lng.toString());
  }, []);

  // Map move handler – track center/zoom
  const handleMapMove = useCallback((center: { lat: number; lng: number }, zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
  }, []);

  // Search result selection
  const handleSearchSelect = useCallback((lat: number, lng: number, address: string) => {
    setMarkerPosition({ lat, lng });
    setLatInput(lat.toString());
    setLngInput(lng.toString());
    setAddressInput(address);
    setFlyTo({ lat, lng, zoom: 13 });
    setErrors({});
  }, []);

  // Manual lat input
  const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLatInput(val);
    setErrors((prev) => ({ ...prev, lat: undefined }));
    const num = parseFloat(val);
    if (!isNaN(num) && num >= -90 && num <= 90) {
      const lng = parseFloat(lngInput);
      if (!isNaN(lng) && lng >= -180 && lng <= 180) {
        setMarkerPosition({ lat: num, lng });
        setFlyTo({ lat: num, lng, zoom: mapZoom > 5 ? mapZoom : 10 });
      } else {
        setMarkerPosition((prev) => (prev ? { ...prev, lat: num } : { lat: num, lng: 0 }));
      }
    }
  };

  // Manual lng input
  const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLngInput(val);
    setErrors((prev) => ({ ...prev, lng: undefined }));
    const num = parseFloat(val);
    if (!isNaN(num) && num >= -180 && num <= 180) {
      const lat = parseFloat(latInput);
      if (!isNaN(lat) && lat >= -90 && lat <= 90) {
        setMarkerPosition({ lat, lng: num });
        setFlyTo({ lat, lng: num, zoom: mapZoom > 5 ? mapZoom : 10 });
      } else {
        setMarkerPosition((prev) => (prev ? { ...prev, lng: num } : { lat: 0, lng: num }));
      }
    }
  };

  // Validate + add/update location
  const handleAddOrUpdate = () => {
    const newErrors: { lat?: string; lng?: string; label?: string } = {};
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (latInput === '' || isNaN(lat)) {
      newErrors.lat = 'Latitude is required';
    } else if (lat < -90 || lat > 90) {
      newErrors.lat = 'Latitude must be between -90 and 90';
    }

    if (lngInput === '' || isNaN(lng)) {
      newErrors.lng = 'Longitude is required';
    } else if (lng < -180 || lng > 180) {
      newErrors.lng = 'Longitude must be between -180 and 180';
    }

    if (!labelInput.trim()) {
      newErrors.label = 'Label is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (editingLocationId) {
      // Update existing
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === editingLocationId
            ? { ...loc, lat, lng, label: labelInput.trim(), address: addressInput.trim() }
            : loc
        )
      );
    } else {
      // Add new
      const newLoc: Location = {
        id: `loc_${Date.now()}`,
        label: labelInput.trim(),
        lat,
        lng,
        address: addressInput.trim(),
      };
      setLocations((prev) => [...prev, newLoc]);
    }

    // Reset all fields
    setMarkerPosition(null);
    setLatInput('');
    setLngInput('');
    setLabelInput('');
    setAddressInput('');
    setEditingLocationId(null);
    setErrors({});
    setFlyTo(null);
  };

  // Edit a location
  const handleEdit = (location: Location) => {
    setEditingLocationId(location.id);
    setLatInput(location.lat.toString());
    setLngInput(location.lng.toString());
    setLabelInput(location.label);
    setAddressInput(location.address);
    setMarkerPosition({ lat: location.lat, lng: location.lng });
    setFlyTo({ lat: location.lat, lng: location.lng, zoom: 13 });
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Delete a location
  const handleDelete = (id: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
    if (editingLocationId === id) {
      setEditingLocationId(null);
      setMarkerPosition(null);
      setLatInput('');
      setLngInput('');
      setLabelInput('');
      setAddressInput('');
      setErrors({});
    }
  };

  // Reorder locations
  const handleReorder = (newLocations: Location[]) => {
    setLocations(newLocations);
  };

  // Confirm + save
  const handleConfirm = async () => {
    if (!client || locations.length === 0) return;
    const payload: MapData = {
      locations,
      mapCenter,
      defaultZoom: mapZoom,
    };
    await client.setValue(JSON.stringify(payload));
    await (client as any).closeApp?.();
  };

  // Loading / error states
  if (isLoading) return <p style={msgStyle}>Loading...</p>;
  if (error) return <p style={{ ...msgStyle, color: 'red' }}>Failed to connect to Sitecore. Please try again.</p>;
  if (!isInitialized) return <p style={msgStyle}>Waiting for Sitecore...</p>;

  return (
    <div ref={topRef} style={containerStyle}>
      {/* Inject italic placeholder styles */}
      <style>{placeholderStyle}</style>
      <h2 style={titleStyle}>📍 Map Location Picker</h2>

      {/* Section 1 — Map */}
      <MapView
        center={mapCenter}
        zoom={mapZoom}
        markerPosition={markerPosition}
        onMapClick={handleMapClick}
        onMarkerDrag={handleMarkerDrag}
        onMapMove={handleMapMove}
        locations={locations}
        editingLocationId={editingLocationId}
        flyTo={flyTo}
      />

      {/* Section 2 — Search */}
      <SearchBox onLocationSelect={handleSearchSelect} />

      {/* Sections 3-5 wrapped in a ref for click-outside detection */}
      <div ref={formRef}>
        {/* Section 3 — Manual Coordinate Input */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Latitude <span style={asteriskStyle}>*</span></label>
            <input
              type="number"
              value={latInput}
              onChange={handleLatChange}
              placeholder="Latitude"
              min={-90}
              max={90}
              step={0.000001}
              style={coordInputStyle}
            />
            {errors.lat && <div style={errorStyle}>{errors.lat}</div>}
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Longitude <span style={asteriskStyle}>*</span></label>
            <input
              type="number"
              value={lngInput}
              onChange={handleLngChange}
              placeholder="Longitude"
              min={-180}
              max={180}
              step={0.000001}
              style={coordInputStyle}
            />
            {errors.lng && <div style={errorStyle}>{errors.lng}</div>}
          </div>
        </div>

        {/* Section 4 — Label */}
        <div style={{ marginTop: 8 }}>
          <label style={labelStyle}>Location Label <span style={asteriskStyle}>*</span></label>
          <input
            type="text"
            className="label-input"
            value={labelInput}
            onChange={(e) => {
              setLabelInput(e.target.value);
              setErrors((prev) => ({ ...prev, label: undefined }));
            }}
            placeholder="e.g. Our London Office"
            maxLength={100}
            style={textInputStyle}
          />
          {errors.label && <div style={errorStyle}>{errors.label}</div>}
        </div>

        {/* Address (read-only / auto-filled from search) */}
        <div style={{ marginTop: 8 }}>
          <label style={labelStyle}>Address</label>
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Address (auto-filled from search)"
            style={textInputStyle}
          />
        </div>

        {/* Section 5 — Add / Update Location Button */}
        <button onClick={handleAddOrUpdate} style={addBtnStyle} type="button">
          {editingLocationId ? 'Update Location' : 'Add Location'}
        </button>
      </div>

      {/* Section 6 — Location List */}
      <LocationList
        locations={locations}
        editingLocationId={editingLocationId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />

      {/* Section 7 — Confirm Button */}
      <button
        onClick={handleConfirm}
        disabled={locations.length === 0}
        style={{
          ...confirmBtnStyle,
          opacity: locations.length === 0 ? 0.5 : 1,
          cursor: locations.length === 0 ? 'not-allowed' : 'pointer',
        }}
        type="button"
      >
        Confirm Locations ({locations.length})
      </button>
    </div>
  );
}

// ---- Styles ----
const containerStyle: React.CSSProperties = {
  maxWidth: 480,
  margin: '0 auto',
  fontFamily: 'sans-serif',
  padding: 16,
  boxSizing: 'border-box',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  marginBottom: 10,
  fontWeight: 700,
};

const msgStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: 40,
  fontFamily: 'sans-serif',
  color: '#555',
};

const coordInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: '0.85rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  outline: 'none',
  fontFamily: 'monospace',
  boxSizing: 'border-box',
};

const textInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: '0.85rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  outline: 'none',
  fontFamily: 'sans-serif',
  boxSizing: 'border-box',
};

const errorStyle: React.CSSProperties = {
  color: 'red',
  fontSize: '0.75rem',
  marginTop: 2,
  fontFamily: 'sans-serif',
};

const addBtnStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 10,
  padding: '10px 0',
  background: '#eb1f1f',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
  fontFamily: 'sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  marginBottom: 3,
  color: '#444',
  fontFamily: 'sans-serif',
};

const asteriskStyle: React.CSSProperties = {
  color: '#eb1f1f',
  fontWeight: 700,
};

const confirmBtnStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 16,
  padding: '12px 0',
  background: '#eb1f1f',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontWeight: 700,
  fontSize: '0.95rem',
  fontFamily: 'sans-serif',
};
