import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const CALAPAN_CENTER = [13.4117, 121.1803];
const CALAPAN_BOUNDS = L.latLngBounds([13.25, 121.05], [13.55, 121.32]);

const pickerIcon = L.divIcon({
  className: 'hazard-map-marker',
  html: '<span class="hazard-map-marker__badge" style="--marker-color:#f97316"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

export function AdminLocationMapPicker({
  latitude = '',
  longitude = '',
  onLocationSelect,
}) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const selectedPointRef = useRef(null);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return undefined;
    const map = L.map(mapElement.current, {
      scrollWheelZoom: false,
      maxBounds: CALAPAN_BOUNDS,
      maxBoundsViscosity: 1,
      minZoom: 11,
      maxZoom: 18,
    }).fitBounds(CALAPAN_BOUNDS);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: 'abc',
      maxZoom: 19,
      keepBuffer: 2,
      updateWhenIdle: true,
      updateWhenZooming: false,
    }).addTo(map);
    mapInstance.current = map;

    const placePin = (point) => {
      if (!CALAPAN_BOUNDS.contains(point)) return;
      selectedPointRef.current = point;
      if (!markerRef.current) {
        markerRef.current = L.marker(point, {
          icon: pickerIcon,
          draggable: true,
          keyboard: true,
        }).addTo(map);
        markerRef.current.on('dragend', () => {
          const position = markerRef.current.getLatLng();
          if (!CALAPAN_BOUNDS.contains(position)) {
            markerRef.current.setLatLng(selectedPointRef.current);
            return;
          }
          placePin(position);
        });
      } else {
        markerRef.current.setLatLng(point);
      }
      onLocationSelectRef.current?.({
        latitude: point.lat.toFixed(7),
        longitude: point.lng.toFixed(7),
      });
    };

    map.on('click', (event) => placePin(event.latlng));
    mapInstance.current.placePin = placePin;

    let resizeFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    resizeObserver.observe(mapElement.current);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng) ||
        !CALAPAN_BOUNDS.contains([lat, lng])) return;

    const point = L.latLng(lat, lng);
    selectedPointRef.current = point;
    if (!markerRef.current) {
      markerRef.current = L.marker(point, {
        icon: pickerIcon,
        draggable: true,
        keyboard: true,
      }).addTo(map);
      markerRef.current.on('dragend', () => {
        const position = markerRef.current.getLatLng();
        if (!CALAPAN_BOUNDS.contains(position)) {
          markerRef.current.setLatLng(selectedPointRef.current);
          return;
        }
        selectedPointRef.current = position;
        onLocationSelectRef.current?.({
          latitude: position.lat.toFixed(7),
          longitude: position.lng.toFixed(7),
        });
      });
    } else {
      markerRef.current.setLatLng(point);
    }
    if (map.getZoom() < 14) map.flyTo(point, 14, { duration: 0.6 });
  }, [latitude, longitude]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
      <div className="relative">
        <div ref={mapElement} className="hazard-leaflet-map h-[320px]" />
        <span className="pointer-events-none absolute left-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-[10px] font-semibold text-slate-200 shadow-lg">
          <MapPin className="h-3.5 w-3.5 text-orange-400" />
          Click or drag the pin within Calapan City
        </span>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-slate-800 p-3">
        <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-[10px] text-slate-300">
          Lat: {latitude || '—'}
        </span>
        <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-[10px] text-slate-300">
          Lng: {longitude || '—'}
        </span>
      </div>
    </div>
  );
}
