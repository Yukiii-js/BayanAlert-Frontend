import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertCircle, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { api, REPORTS_UPDATED_EVENT } from '../api/client';
import 'leaflet/dist/leaflet.css';

const CALAPAN_CENTER = [13.411, 121.18];
const STATUS_COLORS = {
  verified: '#10b981',
  pending: '#f59e0b',
  disputed: '#94a3b8',
  rejected: '#f43f5e',
  resolved: '#14b8a6',
  assigned: '#38bdf8',
  in_progress: '#818cf8',
};

function markerIcon(status) {
  const color = STATUS_COLORS[String(status || '').toLowerCase()] || '#94a3b8';
  return L.divIcon({
    className: 'hazard-map-marker',
    html: `<span style="--marker-color:${color}"><span></span></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function popupContent(report) {
  const root = document.createElement('div');
  root.className = 'hazard-map-popup';

  const title = document.createElement('strong');
  title.textContent = 'Hazard report';
  root.appendChild(title);

  const category = document.createElement('div');
  category.textContent = report.category_name || 'Uncategorized';
  root.appendChild(category);

  const status = document.createElement('span');
  status.textContent = String(report.status || 'pending').replaceAll('_', ' ');
  root.appendChild(status);

  return root;
}

export function HazardMap({
  id,
  className = '',
  height = 'h-[380px]',
  selectable = false,
  selectedLocation = null,
  onLocationSelect,
}) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const selectionLayer = useRef(null);
  const [mapData, setMapData] = useState({ reports: [], categories: [], coordinates_available: false });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadMapData() {
    setLoading(true);
    try {
      const response = await api.getHazardMap();
      const data = response?.data;
      if (!data || !Array.isArray(data.reports) || !Array.isArray(data.categories)) {
        throw new Error('The hazard map returned an invalid data response.');
      }
      setMapData(data);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load hazard locations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMapData();
    const timer = window.setInterval(loadMapData, 60000);
    window.addEventListener(REPORTS_UPDATED_EVENT, loadMapData);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(REPORTS_UPDATED_EVENT, loadMapData);
    };
  }, []);

  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return undefined;

    const map = L.map(mapElement.current, { scrollWheelZoom: false }).setView(CALAPAN_CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);
    selectionLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      markerLayer.current = null;
      selectionLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !selectable || !mapData.coordinates_available || !onLocationSelect) return undefined;

    function selectMapPoint(event) {
      onLocationSelect({
        latitude: event.latlng.lat.toFixed(7),
        longitude: event.latlng.lng.toFixed(7),
      });
    }

    map.on('click', selectMapPoint);
    return () => map.off('click', selectMapPoint);
  }, [selectable, mapData.coordinates_available, onLocationSelect]);

  useEffect(() => {
    const map = mapInstance.current;
    const layer = selectionLayer.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!selectedLocation) return;

    const latitude = Number(selectedLocation.latitude);
    const longitude = Number(selectedLocation.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    L.marker([latitude, longitude], { icon: markerIcon('verified') })
      .bindPopup('Selected report location')
      .addTo(layer);
  }, [selectedLocation]);

  const visibleReports = useMemo(
    () => mapData.reports.filter((report) => (
      selectedCategory === 'all' || String(report.category_id) === selectedCategory
    )),
    [mapData.reports, selectedCategory]
  );

  useEffect(() => {
    const map = mapInstance.current;
    const layer = markerLayer.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const points = [];
    visibleReports.forEach((report) => {
      const latitude = Number(report.latitude);
      const longitude = Number(report.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return;
      }

      const point = [latitude, longitude];
      points.push(point);
      L.marker(point, { icon: markerIcon(report.status) })
        .bindPopup(popupContent(report))
        .addTo(layer);
    });

    if (points.length > 0) {
      map.fitBounds(points, { padding: [36, 36], maxZoom: 15 });
    } else {
      map.setView(CALAPAN_CENTER, 13);
    }
  }, [visibleReports]);

  const statusLegend = [
    ['verified', 'Verified'],
    ['pending', 'Pending'],
    ['disputed', 'Disputed'],
  ];

  return (
    <section id={id} className={`overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 ${className}`}>
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-white">
            <MapPin className="h-5 w-5 text-emerald-400" />
            {selectable ? 'Choose Hazard Location' : 'Community Hazard Map'}
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            {selectable
              ? 'Click the map to select the incident location.'
              : 'Calapan City, Oriental Mindoro · Live database locations'}
          </p>
        </div>
        {!selectable && (
          <>
            <label className="sr-only" htmlFor="map-category-filter">Filter map by hazard category</label>
            <select
              id="map-category-filter"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value="all">All Categories</option>
              {mapData.categories.map((category) => (
                <option key={category.category_id} value={String(category.category_id)}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="relative">
        <div ref={mapElement} className={`hazard-leaflet-map ${height}`} />
        {!selectable && (
          <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl sm:right-5 sm:top-5">
            <p className="mb-2 text-xs font-bold text-white">Map Legend</p>
            <div className="space-y-2 text-[10px] text-slate-300">
              {statusLegend.map(([status, label]) => (
                <p key={status} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                  {label}
                </p>
              ))}
            </div>
          </div>
        )}
        {!selectable && (
          <div className="absolute bottom-3 left-3 z-[500] rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-[10px] text-slate-300">
            <MapPin className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />
            {visibleReports.length} mapped {visibleReports.length === 1 ? 'report' : 'reports'}
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 z-[600] flex items-center justify-center bg-slate-950/65 text-sm text-slate-200">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-400" />
            Loading map locations...
          </div>
        )}
        {!loading && !error && visibleReports.length === 0 && (
          <div className="absolute bottom-14 left-1/2 z-[500] w-[min(90%,24rem)] -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950/95 p-4 text-center shadow-xl">
            <p className="text-sm font-semibold text-slate-200">
              {mapData.coordinates_available ? 'No mapped hazard reports yet' : 'Map locations need database setup'}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {mapData.coordinates_available
                ? 'New reports with a selected map location will appear here. No sample markers are shown.'
                : 'Apply the LavaLust report-coordinate migration to enable saving and displaying report locations.'}
            </p>
          </div>
        )}
        {!loading && error && (
          <div className="absolute bottom-14 left-1/2 z-[600] w-[min(90%,24rem)] -translate-x-1/2 rounded-xl border border-rose-500/30 bg-slate-950/95 p-4 text-center shadow-xl">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-rose-300">
              <AlertCircle className="h-4 w-4" /> Map data unavailable
            </p>
            <p className="mt-1 text-xs text-slate-400">{error}</p>
            <button
              type="button"
              onClick={loadMapData}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
