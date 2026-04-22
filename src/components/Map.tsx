"use client";

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '@/lib/supabase';
import { Camera, MapPin, Clock, Navigation, Crosshair } from 'lucide-react';

// Fix for Leaflet default icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

import { getSlotColor } from '@/lib/colors';

const HOME_COORDS = { lat: 11.949347, lng: 108.431673 };

const createCustomIcon = (label: string, color: string, isHome: boolean = false) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${isHome ? '#f59e0b' : color};
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

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

interface MapViewProps {
  locations: Location[];
  allSlotIds: string[];
  focusLocation?: Location;
  isPickingLocation?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

function MapEvents({ onMapClick, isPickingLocation }: { onMapClick?: (lat: number, lng: number) => void, isPickingLocation?: boolean }) {
  useMapEvents({
    click(e) {
      if (isPickingLocation && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
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

export default function MapView({ 
  locations, 
  allSlotIds,
  focusLocation, 
  isPickingLocation, 
  onMapClick 
}: MapViewProps) {

  // Nhóm địa điểm theo thời gian để vẽ đường đi chính
  const primaryLocations = locations.filter(l => l.is_primary);
  const primaryPath = [
    [HOME_COORDS.lat, HOME_COORDS.lng] as [number, number],
    ...primaryLocations.map(l => [l.lat, l.lng] as [number, number]),
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
        
        <MapUpdater locations={locations} focusLocation={focusLocation} allSlotIds={[]} />
        <MapEvents onMapClick={onMapClick} isPickingLocation={isPickingLocation} />

        {/* Root Point: HOME */}
        <Marker 
          position={[HOME_COORDS.lat, HOME_COORDS.lng]}
          icon={createCustomIcon('', '#f59e0b', true)}
        >
          <Popup>
            <div className="p-1 font-bold">HOME: Phê Thạch (G1-01)</div>
            <div className="text-xs text-gray-500">Điểm khởi hành & Kết thúc</div>
          </Popup>
        </Marker>

        {/* Vẽ các đường từ HOME tới từng địa điểm */}
        {locations.map((loc, idx) => {
          const color = getSlotColor(loc.time_slot_id, allSlotIds);
          const distance = calculateDistance(HOME_COORDS.lat, HOME_COORDS.lng, loc.lat, loc.lng);
          const midLat = (HOME_COORDS.lat + loc.lat) / 2;
          const midLng = (HOME_COORDS.lng + loc.lng) / 2;

          return (
            <React.Fragment key={`dist-${loc.id || idx}`}>
              <Polyline 
                positions={[
                  [HOME_COORDS.lat, HOME_COORDS.lng],
                  [loc.lat, loc.lng]
                ]}
                pathOptions={{ 
                  color: color, 
                  weight: 3, 
                  opacity: 0.6,
                  dashArray: '10, 10'
                }}
              />
              <Marker 
                position={[midLat, midLng]}
                icon={L.divIcon({
                  className: 'distance-label',
                  html: `<div style="
                    background: white;
                    padding: 2px 6px;
                    border-radius: 10px;
                    border: 1px solid ${color};
                    color: ${color};
                    font-size: 10px;
                    font-weight: bold;
                    white-space: nowrap;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                  ">${distance < 1 ? (distance * 1000).toFixed(0) + ' m' : distance.toFixed(1) + ' km'}</div>`,
                  iconSize: [40, 20],
                  iconAnchor: [20, 10],
                })}
              />
            </React.Fragment>
          );
        })}

        {locations.map((loc, idx) => {
          const color = getSlotColor(loc.time_slot_id, allSlotIds);
          const isFocused = focusLocation?.id === loc.id;
          
          return (
            <Marker 
              key={`${loc.id || idx}-${isFocused}`}
              position={[loc.lat, loc.lng]}
              icon={createCustomIcon(loc.is_primary ? (idx + 1).toString() : '?', color)}
              eventHandlers={{
                add: (e) => {
                  if (isFocused) {
                    e.target.openPopup();
                  }
                },
              }}
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
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                        <MapPin className="w-3 h-3" />
                        <span>Đà Lạt, Lâm Đồng</span>
                      </div>
                      {loc.price && loc.price > 0 && (
                        <div className="text-[11px] font-black text-amber-600 flex items-center gap-1">
                          <span>💰</span>
                          <span>{loc.price.toLocaleString('vi-VN')} VNĐ</span>
                        </div>
                      )}
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
          );
        })}

        {/* Tuyến đường chính nối các điểm primary (tùy chọn, giữ lại nếu muốn xem lộ trình) */}
        {primaryPath.length > 2 && (
          <Polyline 
            positions={primaryPath}
            pathOptions={{ 
              color: '#059669', 
              weight: 2, 
              opacity: 0.3,
              lineJoin: 'round'
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
