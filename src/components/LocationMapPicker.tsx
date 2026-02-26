import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapPickerProps {
  latitude?: number;
  longitude?: number;
  radius?: number;
  onLocationChange: (lat: number, lng: number, radius: number) => void;
}

export default function LocationMapPicker({
  latitude = 40.7128,
  longitude = -74.0060,
  radius = 100,
  onLocationChange,
}: LocationMapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentRadius, setCurrentRadius] = useState(radius);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([latitude, longitude], 13);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background: #3b82f6;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: move;
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([latitude, longitude], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([latitude, longitude], {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      radius: radius,
      weight: 2,
    }).addTo(map);
    circleRef.current = circle;

    marker.on('drag', () => {
      const pos = marker.getLatLng();
      circle.setLatLng(pos);
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onLocationChange(pos.lat, pos.lng, currentRadius);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      circle.setLatLng(e.latlng);
      onLocationChange(e.latlng.lat, e.latlng.lng, currentRadius);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && circleRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setRadius(radius);
      mapRef.current?.setView([latitude, longitude], mapRef.current.getZoom());
    }
  }, [latitude, longitude, radius]);

  const handleRadiusChange = (newRadius: number) => {
    setCurrentRadius(newRadius);
    if (circleRef.current) {
      circleRef.current.setRadius(newRadius);
    }
    if (markerRef.current) {
      const pos = markerRef.current.getLatLng();
      onLocationChange(pos.lat, pos.lng, newRadius);
    }
  };

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="h-96 w-full rounded-lg border-2 border-gray-300 overflow-hidden" />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Geofence Radius: {currentRadius}m
        </label>
        <input
          type="range"
          min="50"
          max="5000"
          step="50"
          value={currentRadius}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>50m</span>
          <span>5000m</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label className="text-gray-600">Latitude:</label>
          <div className="font-mono text-gray-900">{latitude.toFixed(6)}</div>
        </div>
        <div>
          <label className="text-gray-600">Longitude:</label>
          <div className="font-mono text-gray-900">{longitude.toFixed(6)}</div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">How to use:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Click anywhere on the map to set location</li>
          <li>Drag the blue marker to adjust position</li>
          <li>Use the slider to adjust geofence radius</li>
        </ul>
      </div>
    </div>
  );
}
