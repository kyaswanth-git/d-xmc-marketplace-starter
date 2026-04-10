export interface Location {
  id: string;
  label: string;
  lat: number;
  lng: number;
  address: string;
}

export interface MapData {
  locations: Location[];
  mapCenter: { lat: number; lng: number };
  defaultZoom: number;
}
