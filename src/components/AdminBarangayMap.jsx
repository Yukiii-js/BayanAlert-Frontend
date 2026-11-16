import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertCircle, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const CALAPAN_CENTER = [13.4117, 121.1803];

function normalizeName(value) {
  return String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function isActive(record) {
  return record?.is_active === true || record?.is_active === 1 || record?.is_active === '1';
}

export function AdminBarangayMap({
  barangays = [],
  selectedBarangayId,
  onSelect,
}) {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const polygonLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const recordsByNameRef = useRef(new Map());
  const onSelectRef = useRef(onSelect);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);

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
    mapRef.current = map;

    let active = true;
    fetch('/data/calapan_barangays.geojson')
      .then((response) => {
        if (!response.ok) throw new Error(`Boundary data could not be loaded (HTTP ${response.status}).`);
        return response.json();
      })
      .then((geojson) => {
        if (!active) return;
        const layer = L.geoJSON(geojson, {
          style: (feature) => {
            const record = recordsByNameRef.current.get(
              normalizeName(feature?.properties?.adm4_name)
            );
            const enabled = !record || isActive(record);
            return {
              color: '#10b981',
              weight: 1,
              opacity: enabled ? 0.75 : 0.4,
              fillColor: enabled ? '#10b981' : '#64748b',
              fillOpacity: enabled ? 0.13 : 0.06,
            };
          },
          onEachFeature: (feature, featureLayer) => {
            const name = feature?.properties?.adm4_name || 'Barangay';
            featureLayer.bindTooltip(name, { sticky: true, direction: 'top' });
            featureLayer.on('click', () => {
              const record = recordsByNameRef.current.get(normalizeName(name));
              if (record) onSelectRef.current?.(record);
            });
          },
        }).addTo(map);
        polygonLayerRef.current = layer;
        if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [12, 12] });
        setMapReady(true);
        setLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || 'Barangay boundaries could not be loaded.');
        setLoading(false);
      });

    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;
    let resizeFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    resizeObserver.observe(mapElement.current);

    return () => {
      active = false;
      resizeObserver.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      map.remove();
      mapRef.current = null;
      polygonLayerRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    recordsByNameRef.current = new Map(
      barangays.map((record) => [normalizeName(record.barangay_name), record])
    );
    const map = mapRef.current;
    const polygons = polygonLayerRef.current;
    const markers = markerLayerRef.current;
    if (!map || !polygons || !markers) return;

    polygons.eachLayer((layer) => {
      const record = recordsByNameRef.current.get(
        normalizeName(layer.feature?.properties?.adm4_name)
      );
      const enabled = !record || isActive(record);
      const selected = record && String(record.barangay_id) === String(selectedBarangayId);
      layer.setStyle({
        color: selected ? '#f97316' : '#10b981',
        weight: selected ? 3 : 1,
        opacity: enabled ? 0.75 : 0.4,
        fillColor: selected ? '#f97316' : enabled ? '#10b981' : '#64748b',
        fillOpacity: selected ? 0.26 : enabled ? 0.13 : 0.06,
      });
    });

    markers.clearLayers();
    barangays.forEach((record) => {
      if (record.latitude === null || record.latitude === undefined
          || record.longitude === null || record.longitude === undefined
          || String(record.latitude).trim() === '' || String(record.longitude).trim() === '') return;
      const latitude = Number(record.latitude);
      const longitude = Number(record.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      const selected = String(record.barangay_id) === String(selectedBarangayId);
      const marker = L.circleMarker([latitude, longitude], {
        radius: selected ? 7 : 5,
        color: '#f8fafc',
        weight: 1.5,
        fillColor: selected ? '#f97316' : isActive(record) ? '#10b981' : '#64748b',
        fillOpacity: 1,
      }).addTo(markers);
      marker.bindTooltip(record.barangay_name, { direction: 'top', offset: [0, -6] });
      marker.on('click', () => onSelectRef.current?.(record));
    });
  }, [barangays, selectedBarangayId, mapReady]);

  useEffect(() => {
    const record = barangays.find(
      (item) => String(item.barangay_id) === String(selectedBarangayId)
    );
    const map = mapRef.current;
    if (!record || !map) return;

    const hasCoordinates = record.latitude !== null && record.latitude !== undefined
      && record.longitude !== null && record.longitude !== undefined
      && String(record.latitude).trim() !== '' && String(record.longitude).trim() !== '';
    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);
    if (hasCoordinates && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), 14), { duration: 0.6 });
      return;
    }

    polygonLayerRef.current?.eachLayer((layer) => {
      if (normalizeName(layer.feature?.properties?.adm4_name) === normalizeName(record.barangay_name)) {
        const bounds = layer.getBounds();
        if (bounds.isValid()) map.flyToBounds(bounds, { maxZoom: 15, duration: 0.6 });
      }
    });
  }, [barangays, selectedBarangayId, mapReady]);

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div ref={mapElement} className="hazard-leaflet-map h-[420px]" />
      {loading && (
        <div role="status" className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-950/75 text-sm text-slate-300">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-orange-400" />
          Loading barangay boundaries...
        </div>
      )}
      {error && (
        <div role="alert" className="absolute left-3 right-3 top-3 z-[500] flex items-start gap-2 rounded-lg border border-rose-500/30 bg-slate-950/95 p-3 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex flex-wrap gap-2 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-[10px] text-slate-300 shadow-lg">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-400" />Active</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-slate-500" />Inactive</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-orange-400" />Selected</span>
      </div>
    </div>
  );
}
