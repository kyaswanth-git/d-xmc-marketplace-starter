'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from './types';

// Fix Leaflet default marker icon issue with Next.js / webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const editingIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'editing-marker',
});

interface MapViewProps {
  center: { lat: number; lng: number };
  zoom: number;
  markerPosition: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDrag: (lat: number, lng: number) => void;
  onMapMove: (center: { lat: number; lng: number }, zoom: number) => void;
  locations: Location[];
  editingLocationId: string | null;
  flyTo: { lat: number; lng: number; zoom: number } | null;
}

function MapEvents({
  onMapClick,
  onMapMove,
}: {
  onMapClick: (lat: number, lng: number) => void;
  onMapMove: (center: { lat: number; lng: number }, zoom: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(
        parseFloat(e.latlng.lat.toFixed(6)),
        parseFloat(e.latlng.lng.toFixed(6))
      );
    },
    moveend(e) {
      const map = e.target;
      const c = map.getCenter();
      onMapMove({ lat: c.lat, lng: c.lng }, map.getZoom());
    },
  });
  return null;
}

function FlyToHandler({ flyTo }: { flyTo: { lat: number; lng: number; zoom: number } | null }) {
  const map = useMap();
  const lastFlyTo = useRef<string | null>(null);

  useEffect(() => {
    if (!flyTo) return;
    const key = `${flyTo.lat},${flyTo.lng},${flyTo.zoom}`;
    if (lastFlyTo.current === key) return;
    lastFlyTo.current = key;
    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom);
  }, [flyTo, map]);

  return null;
}

export default function MapView({
  center,
  zoom,
  markerPosition,
  onMapClick,
  onMarkerDrag,
  onMapMove,
  locations,
  editingLocationId,
  flyTo,
}: MapViewProps) {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMapClick={onMapClick} onMapMove={onMapMove} />
        <FlyToHandler flyTo={flyTo} />

        {/* Current active marker (being placed / edited) */}
        {markerPosition && (
          <Marker
            position={[markerPosition.lat, markerPosition.lng]}
            icon={defaultIcon}
            draggable
            eventHandlers={{
              dragend(e) {
                const latlng = e.target.getLatLng();
                onMarkerDrag(
                  parseFloat(latlng.lat.toFixed(6)),
                  parseFloat(latlng.lng.toFixed(6))
                );
              },
            }}
          />
        )}

        {/* Confirmed location pins */}
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={loc.id === editingLocationId ? editingIcon : defaultIcon}
          />
        ))}
      </MapContainer>
    </div>
  );
}
