import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CALAPAN_CENTER = [13.4117, 121.1803];

function hasCoordinates(record) {
  return record?.latitude !== null && record?.latitude !== undefined
    && record?.longitude !== null && record?.longitude !== undefined
    && String(record.latitude).trim() !== '' && String(record.longitude).trim() !== ''
    && Number.isFinite(Number(record.latitude)) && Number.isFinite(Number(record.longitude));
}

export function AdminStationsMap({
  stations = [],
  selectedStationId,
  onSelect,
}) {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return undefined;
    const map = L.map(mapElement.current, {
      scrollWheelZoom: false,
      minZoom: 11,
      maxZoom: 18,
    }).setView(CALAPAN_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: 'abc',
      maxZoom: 19,
      keepBuffer: 2,
      updateWhenIdle: true,
      updateWhenZooming: false,
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

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
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markersRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    const points = [];
    stations.filter(hasCoordinates).forEach((station) => {
      const position = [Number(station.latitude), Number(station.longitude)];
      const selected = String(station.station_id) === String(selectedStationId);
      const marker = L.circleMarker(position, {
        radius: selected ? 9 : 6,
        color: '#fff',
        weight: 1.5,
        fillColor: selected ? '#f97316' : '#ef4444',
        fillOpacity: 0.95,
      }).addTo(markerLayer);
      marker.bindTooltip(station.station_name || 'Response station', { direction: 'top', offset: [0, -7] });
      marker.on('click', () => onSelectRef.current?.(station));
      points.push(position);
    });

    if (selectedStationId !== null && selectedStationId !== undefined) {
      const selected = stations.find((station) => (
        String(station.station_id) === String(selectedStationId) && hasCoordinates(station)
      ));
      if (selected) {
        map.flyTo([Number(selected.latitude), Number(selected.longitude)], Math.max(map.getZoom(), 14), { duration: 0.6 });
        return;
      }
    }
    if (points.length > 1 && map.getZoom() < 12) {
      map.fitBounds(L.latLngBounds(points), { padding: [18, 18], maxZoom: 14 });
    } else if (points.length === 1 && map.getZoom() < 14) {
      map.setView(points[0], 14);
    }
  }, [stations, selectedStationId]);

  return <div ref={mapElement} className="hazard-leaflet-map h-[260px]" />;
}
