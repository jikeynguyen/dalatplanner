"use client";

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '@/lib/supabase';
import { Camera, MapPin, Clock, Navigation } from 'lucide-react';

// Fix for Leaflet default icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const HOME_COORDS = { lat: 11.949347, lng: 108.431673 };

const createCustomIcon = (label: string, isPrimary: boolean = true, isHome: boolean = false) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${isHome ? '#f59e0b' : (isPrimary ? '#065f46' : '#94a3b8')};
      color: white;
      width: ${isHome ? '32px' : '28px'};
      height: ${isHome ? '32px' : '28px'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    ">${isHome ? '🏠' : label}</div>`,
    iconSize: [isHome ? 32 : 28, isHome ? 32 : 28],
    iconAnchor: [isHome ? 16 : 14, isHome ? 16 : 14],
  });
};

interface MapViewProps {
  locations: Location[];
  focusLocation?: Location;
}

function MapUpdater({ locations, focusLocation }: MapViewProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const coords = [
      [HOME_COORDS.lat, HOME_COORDS.lng] as [number, number],
      ...locations.map(l => [l.lat, l.lng] as [number, number])
    ];
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, locations]);

  useEffect(() => {
    if (map && focusLocation) {
      map.setView([focusLocation.lat, focusLocation.lng], 16, { animate: true });
    }
  }, [map, focusLocation]);

  return null;
}

export default function MapView({ locations, focusLocation }: MapViewProps) {
  // Nhóm địa điểm theo thời gian để vẽ đường đi chính, bắt đầu và kết thúc tại HOME
  const primaryPath = [
    [HOME_COORDS.lat, HOME_COORDS.lng] as [number, number],
    ...locations
      .filter(l => l.is_primary)
      .map(l => [l.lat, l.lng] as [number, number]),
    [HOME_COORDS.lat, HOME_COORDS.lng] as [number, number]
  ];

  return (
    <div className="flex-1 h-full w-full relative z-0">
      <MapContainer
        center={[11.9404, 108.4373]} // Da Lat center
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater locations={locations} focusLocation={focusLocation} />

        {/* Root Point: HOME */}
        <Marker 
          position={[HOME_COORDS.lat, HOME_COORDS.lng]}
          icon={createCustomIcon('', true, true)}
        >
          <Popup>
            <div className="p-1 font-bold">HOME: Phê Thạch (G1-01)</div>
            <div className="text-xs text-gray-500">Điểm khởi hành & Kết thúc</div>
          </Popup>
        </Marker>

        {locations.map((loc, idx) => (
          <Marker 
            key={loc.id || idx}
            position={[loc.lat, loc.lng]}
            icon={createCustomIcon(loc.is_primary ? (idx + 1).toString() : '?', loc.is_primary)}
          >
            <Popup minWidth={250} className="custom-popup">
              <div className="p-1">
                {loc.images && loc.images.length > 0 && (
                  <div className="flex gap-1 mb-2 overflow-x-auto pb-1 scrollbar-hide">
                    {loc.images.map((img, i) => (
                      <img 
                        key={i} 
                        src={img} 
                        className="w-32 h-24 object-cover rounded-lg shrink-0" 
                        alt={loc.name}
                      />
                    ))}
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-1">{loc.name}</h3>
                {loc.description && (
                  <p className="text-sm text-gray-600 mb-3">{loc.description}</p>
                )}
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                    <MapPin className="w-3 h-3" />
                    <span>Đà Lạt, Lâm Đồng</span>
                  </div>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    CHỈ ĐƯỜNG
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Tuyến đường chính */}
        {primaryPath.length > 1 && (
          <Polyline 
            positions={primaryPath}
            pathOptions={{ 
              color: '#059669', 
              weight: 5, 
              opacity: 0.7,
              lineJoin: 'round'
            }}
          />
        )}

        {/* Vẽ các đường nhánh cho options phụ (nếu cần thiết) */}
        {locations.filter(l => !l.is_primary).map((loc, i) => {
          // Tìm địa điểm chính cùng khung giờ
          const primaryInSameSlot = locations.find(l => l.time_slot_id === loc.time_slot_id && l.is_primary);
          if (primaryInSameSlot) {
            return (
              <Polyline 
                key={`branch-${i}`}
                positions={[
                  [primaryInSameSlot.lat, primaryInSameSlot.lng],
                  [loc.lat, loc.lng]
                ]}
                pathOptions={{ 
                  color: '#94a3b8', 
                  weight: 2, 
                  dashArray: '5, 5',
                  opacity: 0.5
                }}
              />
            );
          }
          return null;
        })}
      </MapContainer>
    </div>
  );
}
