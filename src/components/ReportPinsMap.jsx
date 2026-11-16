import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CALAPAN_CENTER = [13.4117, 121.1803];
const CALAPAN_BOUNDS = L.latLngBounds([13.25, 121.05], [13.55, 121.32]);
const STATUS_COLORS = {
  pending: '#f59e0b',
  approved: '#10b981',
  verified: '#10b981',
  assigned: '#10b981',
  in_progress: '#10b981',
  disputed: '#f43f5e',
  rejected: '#f43f5e',
  resolved: '#64748b',
};

function reportIcon(status) {
  const color = STATUS_COLORS[String(status || '').toLowerCase()] || '#94a3b8';
  return L.divIcon({
    className: 'hazard-map-marker',
    html: `<span class="hazard-map-marker__badge" style="--marker-color:${color}"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 16h.01"/></svg></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function reportLabel(report) {
  const status = String(report.status || 'pending').replaceAll('_', ' ');
  const title = String(report.title || 'Hazard report')
    .replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character]);
  return `<strong>${title}</strong><br><span>${status}</span>`;
}

export const ReportPinsMap = forwardRef(function ReportPinsMap({
  reports = [],
  selectedReportId = null,
  onReportSelect,
  height = 'h-[380px]',
  className = '',
  fitReports = true,
}, ref) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const markersById = useRef(new Map());

  useImperativeHandle(ref, () => ({
    focusReport(reportOrId) {
      const reportId = typeof reportOrId === 'object'
        ? reportOrId?.report_id
        : reportOrId;
      const marker = markersById.current.get(String(reportId));
      if (!marker || !mapInstance.current) return false;
      const point = marker.getLatLng();
      mapInstance.current.flyTo(point, Math.max(mapInstance.current.getZoom(), 15), {
        duration: 0.6,
      });
      marker.openPopup();
      return true;
    },
  }), []);

  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return undefined;
    const map = L.map(mapElement.current, {
      scrollWheelZoom: false,
      maxBounds: CALAPAN_BOUNDS,
      maxBoundsViscosity: 1,
      minZoom: 11,
      maxZoom: 18,
    }).setView(CALAPAN_CENTER, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: 'abc',
      maxZoom: 19,
      keepBuffer: 2,
      updateWhenIdle: true,
      updateWhenZooming: false,
    }).addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

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
      markerLayer.current = null;
      markersById.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const layer = markerLayer.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersById.current.clear();
    const points = [];
    reports.forEach((report) => {
      const latitude = Number(report.latitude);
      const longitude = Number(report.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          !CALAPAN_BOUNDS.contains([latitude, longitude])) return;

      const marker = L.marker([latitude, longitude], {
        icon: reportIcon(report.status),
        keyboard: true,
      })
        .bindPopup(reportLabel(report), { maxWidth: 240 })
        .addTo(layer);
      marker.on('click', () => onReportSelect?.(report));
      points.push([latitude, longitude]);
      markersById.current.set(String(report.report_id), marker);
    });

    if (fitReports && points.length) {
      map.fitBounds(points, { padding: [32, 32], maxZoom: 15 });
    }
  }, [fitReports, onReportSelect, reports]);

  useEffect(() => {
    if (selectedReportId !== null && selectedReportId !== undefined) {
      markersById.current.get(String(selectedReportId))?.openPopup();
    }
  }, [selectedReportId]);

  return (
    <div
      ref={mapElement}
      className={`hazard-leaflet-map ${height} ${className}`}
      aria-label="Hazard report locations"
    />
  );
});
