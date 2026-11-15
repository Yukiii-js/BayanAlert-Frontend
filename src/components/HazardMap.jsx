import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertCircle, AlertTriangle, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import 'leaflet/dist/leaflet.css';

const WeatherMapAnimation = lazy(() => import('./WeatherMapAnimation'));

const CALAPAN_CENTER = [13.411, 121.18];
const CALAPAN_BOUNDS = L.latLngBounds([13.25, 121.05], [13.55, 121.32]);
const STATUS_COLORS = {
  verified: '#10b981',
  pending: '#f59e0b',
  disputed: '#94a3b8',
  rejected: '#f43f5e',
  resolved: '#14b8a6',
  assigned: '#38bdf8',
  in_progress: '#818cf8',
};
const BARANGAY_DATA_URL = '/data/calapan_barangays.geojson';
const EMERGENCY_PLACES_DATA_URL = '/data/calapan_emergency_places.geojson';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const EMERGENCY_PLACE_STYLES = {
  hospital: { label: 'Hospital', symbol: 'H', color: '#dc2626' },
  clinic: { label: 'Clinic / health center', symbol: '+', color: '#e11d48' },
  police: { label: 'Police / law enforcement', symbol: 'P', color: '#2563eb' },
  fire_station: { label: 'Fire station', symbol: 'F', color: '#ea580c' },
  evacuation_center: { label: 'OSM-tagged evacuation center', symbol: 'E', color: '#059669' },
  potential_evacuation_site: { label: 'Possible site (unverified)', symbol: '?', color: '#7c3aed' },
};

function getBarangayName(feature) {
  const properties = feature?.properties || {};
  const name = Object.entries(properties).find(([key, value]) => (
    typeof value === 'string' &&
    value.trim() &&
    /^(adm4_name\d*|adm4_en|name_4|name|barangay)$/i.test(key)
  ))?.[1];
  return name || 'Barangay';
}

function isCalapanBarangay(feature) {
  const properties = feature?.properties || {};
  const municipalityCode = String(properties.adm3_pcode || '').trim();
  if (municipalityCode === 'PH1705205') return true;

  return Object.entries(properties).some(([key, value]) => (
    /^adm3_name\d*$/i.test(key) &&
    typeof value === 'string' &&
    /^(?:city of )?calapan(?: city)?(?:\s*\(capital\))?$/i.test(value.trim())
  ));
}

function hasValidRegionalGeometry(geometry) {
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return false;
  let hasRegionalCoordinate = false;
  let hasInvalidCoordinate = false;

  function visit(value) {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
      const [longitude, latitude] = value;
      if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
        hasInvalidCoordinate = true;
        return;
      }
      if (longitude >= 120.5 && longitude <= 122 && latitude >= 12.5 && latitude <= 14.5) {
        hasRegionalCoordinate = true;
      }
      return;
    }
    value.forEach(visit);
  }

  visit(geometry.coordinates);
  return hasRegionalCoordinate && !hasInvalidCoordinate;
}

function emergencyPlaceIcon(category) {
  const marker = EMERGENCY_PLACE_STYLES[category] || EMERGENCY_PLACE_STYLES.potential_evacuation_site;
  const shelter = ['evacuation_center', 'potential_evacuation_site'].includes(category);
  const glyph = shelter
    ? '<svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 4l9 6.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-6h4v6"/><path d="M2.5 13h3"/><path d="m3.5 11.5-1 1.5 1 1.5"/></svg>'
    : `<span style="font-size:11px;font-weight:800">${marker.symbol}</span>`;
  const uncertainty = category === 'potential_evacuation_site'
    ? '<span style="position:absolute;right:-4px;top:-4px;display:inline-flex;width:12px;height:12px;align-items:center;justify-content:center;border:1px solid white;border-radius:50%;background:#7c3aed;color:white;font-size:8px;font-weight:800">?</span>'
    : '';
  return L.divIcon({
    className: 'emergency-place-marker',
    html: `<span style="position:relative;display:inline-flex;width:32px;height:32px;align-items:center;justify-content:center;border:2px solid white;border-radius:50%;background:${shelter ? '#059669' : marker.color};box-shadow:0 2px 8px rgba(15,23,42,.7);color:white">${glyph}${uncertainty}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function overpassFireStationFeatures(elements) {
  return elements.flatMap((element) => {
    const tags = element?.tags || {};
    const latitude = Number(element?.lat ?? element?.center?.lat);
    const longitude = Number(element?.lon ?? element?.center?.lon);
    if ((!tags.amenity || tags.amenity !== 'fire_station') &&
        (!tags.emergency || tags.emergency !== 'fire_station')) return [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        !CALAPAN_BOUNDS.contains([latitude, longitude])) return [];

    const address = [
      tags['addr:street'],
      tags['addr:suburb'] || tags['addr:place'],
      tags['addr:city'],
    ].filter(Boolean).join(', ');
    const id = Number(element.id);
    return [{
      type: 'Feature',
      properties: {
        category: 'fire_station',
        name: tags.name || tags['name:en'] || 'Unnamed fire station',
        address: address || undefined,
        phone: tags.phone || tags['contact:phone'] || undefined,
        opening_hours: tags.opening_hours || undefined,
        osm_type: element.type,
        osm_id: Number.isInteger(id) && id > 0 ? id : undefined,
        source_tags: tags,
      },
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
    }];
  });
}

function isNearbyDuplicateFireStation(existing, candidate) {
  const [longitude, latitude] = existing.geometry.coordinates;
  const [candidateLongitude, candidateLatitude] = candidate.geometry.coordinates;
  return existing.properties.category === 'fire_station' &&
    Math.abs(latitude - candidateLatitude) < 0.0005 &&
    Math.abs(longitude - candidateLongitude) < 0.0005;
}

function emergencyPlacePopupContent(place) {
  const properties = place.properties || {};
  const category = EMERGENCY_PLACE_STYLES[properties.category] || EMERGENCY_PLACE_STYLES.potential_evacuation_site;
  const root = document.createElement('div');
  root.className = 'hazard-map-popup';

  const title = document.createElement('strong');
  title.textContent = properties.name || category.label;
  root.appendChild(title);

  const placeType = document.createElement('div');
  placeType.textContent = category.label;
  root.appendChild(placeType);

  if (properties.category === 'potential_evacuation_site') {
    const caution = document.createElement('span');
    caution.textContent = 'Possible site only — not confirmed as an official evacuation center. Verify with Calapan City DRRMO before relying on it.';
    root.appendChild(caution);
  }

  if (properties.contact_status === 'user_provided_unverified') {
    const caution = document.createElement('span');
    caution.textContent = 'Contact details and map location were provided by a user and have not been independently verified. Confirm with BFP before relying on them.';
    root.appendChild(caution);
  }

  [['address', 'Address'], ['phone', 'Phone'], ['opening_hours', 'Hours']].forEach(([key, label]) => {
    if (!properties[key]) return;
    const detail = document.createElement('div');
    detail.textContent = `${label}: ${properties[key]}`;
    root.appendChild(detail);
  });

  if (Array.isArray(properties.alternate_contacts)) {
    properties.alternate_contacts.forEach((contact) => {
      if (!contact || typeof contact.name !== 'string' || typeof contact.phone !== 'string') return;
      const detail = document.createElement('div');
      detail.textContent = `${contact.name} — ${contact.phone} (city-wide contact; location not verified)`;
      root.appendChild(detail);
    });
  }

  const osmTypes = ['node', 'way', 'relation'];
  const osmId = Number(properties.osm_id);
  if (osmTypes.includes(properties.osm_type) && Number.isInteger(osmId) && osmId > 0) {
    const link = document.createElement('a');
    link.href = `https://www.openstreetmap.org/${properties.osm_type}/${osmId}`;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'View OpenStreetMap record';
    root.appendChild(link);
  }

  return root;
}

function markerIcon(status, severity) {
  const normalizedStatus = String(status || '').toLowerCase();
  const color = STATUS_COLORS[normalizedStatus] || '#94a3b8';
  const highSeverity = /^(high|critical|severe|red)$/i.test(String(severity || ''));
  const pulse = normalizedStatus === 'verified' || highSeverity;
  return L.divIcon({
    className: 'hazard-map-marker',
    html: `<span class="hazard-map-marker__badge${pulse ? ' hazard-map-marker__badge--pulse' : ''}" style="--marker-color:${color}"><svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 16h.01"/></svg></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
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
  weather = null,
}) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const selectionLayer = useRef(null);
  const barangayLayer = useRef(null);
  const emergencyServicesLayer = useRef(null);
  const potentialSitesLayer = useRef(null);
  const hasFittedReports = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapData, setMapData] = useState({ reports: [], categories: [], coordinates_available: false });
  const [externalLayerState, setExternalLayerState] = useState({
    hdx: true,
    weather: true,
    emergencyServices: true,
    potentialSites: true,
  });
  const [externalLayersOpen, setExternalLayersOpen] = useState(false);
  const [hdxStatus, setHdxStatus] = useState('loading');
  const [hdxError, setHdxError] = useState('');
  const [emergencyPlaces, setEmergencyPlaces] = useState([]);
  const [emergencyPlacesStatus, setEmergencyPlacesStatus] = useState('loading');
  const [emergencyPlacesError, setEmergencyPlacesError] = useState('');
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
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return undefined;

    const map = L.map(mapElement.current, {
      scrollWheelZoom: false,
      maxBounds: CALAPAN_BOUNDS,
      maxBoundsViscosity: 1,
      minZoom: 11,
      maxZoom: 18,
    }).fitBounds(CALAPAN_BOUNDS);
    const weatherPane = map.createPane('weatherAnimationPane');
    weatherPane.style.zIndex = '550';
    weatherPane.style.pointerEvents = 'none';
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: 'abc',
      maxZoom: 19,
      keepBuffer: 2,
      updateWhenIdle: true,
      updateWhenZooming: false,
    }).addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);
    selectionLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    setMapReady(true);

    let resizeFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
      });
    });
    resizeObserver.observe(mapElement.current);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      map.remove();
      mapInstance.current = null;
      markerLayer.current = null;
      selectionLayer.current = null;
      barangayLayer.current = null;
      emergencyServicesLayer.current = null;
      potentialSitesLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady || selectable) return undefined;
    let active = true;

    async function loadBarangayBoundaries() {
      setHdxStatus('loading');
      setHdxError('');
      try {
        const response = await fetch(BARANGAY_DATA_URL, { cache: 'force-cache' });
        if (!response.ok) {
          throw new Error(`The regional barangay GeoJSON returned HTTP ${response.status}.`);
        }
        const collection = await response.json();
        if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
          throw new Error('The barangay boundary file is not a valid GeoJSON FeatureCollection.');
        }

        const features = collection.features.filter((feature) => (
          feature?.type === 'Feature' &&
          isCalapanBarangay(feature) &&
          hasValidRegionalGeometry(feature.geometry)
        ));
        if (!features.length) {
          throw new Error('The boundary dataset has no valid Calapan City barangay polygons.');
        }

        if (!active) return;
        if (!map.getPane('barangayBoundaries')) {
          const pane = map.createPane('barangayBoundaries');
          pane.style.zIndex = '390';
        }
        barangayLayer.current = L.geoJSON(
          { type: 'FeatureCollection', features },
          {
            pane: 'barangayBoundaries',
            style: {
              color: '#f97316',
              weight: 1,
              opacity: 0.85,
              fillColor: '#f97316',
              fillOpacity: 0.045,
            },
            onEachFeature(feature, layer) {
              const name = getBarangayName(feature);
              layer.bindTooltip(name, { sticky: true, direction: 'top' });
              const popup = document.createElement('div');
              popup.className = 'hazard-map-popup';
              const heading = document.createElement('strong');
              heading.textContent = name;
              popup.appendChild(heading);
              const area = document.createElement('span');
              area.textContent = 'Calapan City · Oriental Mindoro';
              popup.appendChild(area);
              layer.bindPopup(popup);
              layer.on({
                mouseover() {
                  layer.setStyle({ weight: 2, fillOpacity: 0.14 });
                },
                mouseout() {
                  barangayLayer.current?.resetStyle(layer);
                },
              });
            },
          }
        );
        setHdxStatus('available');
        setExternalLayerState((current) => ({ ...current, hdx: true }));
      } catch (loadError) {
        if (!active) return;
        setHdxStatus('unavailable');
        setHdxError(loadError.message || 'Barangay boundaries could not be loaded.');
      }
    }

    loadBarangayBoundaries();
    return () => {
      active = false;
      if (barangayLayer.current) {
        map.removeLayer(barangayLayer.current);
        barangayLayer.current = null;
      }
    };
  }, [mapReady, selectable]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady || selectable) return undefined;
    let active = true;
    let overpassController = null;

    async function loadEmergencyPlaces() {
      setEmergencyPlacesStatus('loading');
      setEmergencyPlacesError('');
      try {
        const response = await fetch(EMERGENCY_PLACES_DATA_URL, { cache: 'force-cache' });
        if (!response.ok) {
          throw new Error(`The emergency places GeoJSON returned HTTP ${response.status}.`);
        }
        const collection = await response.json();
        if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
          throw new Error('The emergency places file is not a valid GeoJSON FeatureCollection.');
        }

        const categories = Object.keys(EMERGENCY_PLACE_STYLES);
        const features = collection.features.filter((feature) => {
          const coordinates = feature?.geometry?.coordinates;
          const longitude = Number(coordinates?.[0]);
          const latitude = Number(coordinates?.[1]);
          return feature?.type === 'Feature' &&
            feature.geometry?.type === 'Point' &&
            categories.includes(feature.properties?.category) &&
            typeof feature.properties?.name === 'string' &&
            feature.properties.name.trim().length > 0 &&
            Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            CALAPAN_BOUNDS.contains([latitude, longitude]);
        });
        if (features.length !== collection.features.length) {
          throw new Error('The emergency places dataset contains unnamed, invalid, or out-of-area locations.');
        }
        if (!features.length) {
          throw new Error('The emergency places dataset has no valid Calapan City locations.');
        }

        let liveLookupWarning = '';
        overpassController = new AbortController();
        const timeout = window.setTimeout(() => overpassController?.abort(), 8000);
        try {
          const query = '[out:json][timeout:7];area["name"~"^Calapan( City)?$"]["boundary"="administrative"]->.calapan;(nwr["amenity"="fire_station"](area.calapan);nwr["emergency"="fire_station"](area.calapan););out center tags;';
          const overpassResponse = await fetch(OVERPASS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: new URLSearchParams({ data: query }),
            signal: overpassController.signal,
          });
          if (!overpassResponse.ok) {
            throw new Error(`Overpass returned HTTP ${overpassResponse.status}.`);
          }
          const overpassData = await overpassResponse.json();
          if (!Array.isArray(overpassData?.elements)) {
            throw new Error('Overpass returned an invalid response.');
          }
          const liveStations = overpassFireStationFeatures(overpassData.elements);
          liveStations.forEach((station) => {
            if (!features.some((existing) => isNearbyDuplicateFireStation(existing, station))) {
              features.push(station);
            }
          });
        } catch {
          liveLookupWarning = 'Live OSM fire-station lookup is unavailable; showing the local snapshot.';
        } finally {
          window.clearTimeout(timeout);
          overpassController = null;
        }

        if (!active) return;
        if (!map.getPane('emergencyPlaces')) {
          const pane = map.createPane('emergencyPlaces');
          pane.style.zIndex = '430';
        }

        const services = features.filter((feature) => feature.properties.category !== 'potential_evacuation_site');
        const potentialSites = features.filter((feature) => feature.properties.category === 'potential_evacuation_site');
        emergencyServicesLayer.current = L.layerGroup(services.map((feature) => {
          const [longitude, latitude] = feature.geometry.coordinates;
          return L.marker([latitude, longitude], {
            icon: emergencyPlaceIcon(feature.properties.category),
            pane: 'emergencyPlaces',
          })
            .bindTooltip(feature.properties.name, { direction: 'top', offset: [0, -12] })
            .bindPopup(emergencyPlacePopupContent(feature));
        }));
        potentialSitesLayer.current = L.layerGroup(potentialSites.map((feature) => {
          const [longitude, latitude] = feature.geometry.coordinates;
          return L.marker([latitude, longitude], {
            icon: emergencyPlaceIcon(feature.properties.category),
            pane: 'emergencyPlaces',
          })
            .bindTooltip(feature.properties.name, { direction: 'top', offset: [0, -12] })
            .bindPopup(emergencyPlacePopupContent(feature));
        }));

        setEmergencyPlaces(features);
        setEmergencyPlacesStatus('available');
        setEmergencyPlacesError(liveLookupWarning);
      } catch (loadError) {
        if (!active) return;
        setEmergencyPlacesStatus('unavailable');
        setEmergencyPlacesError(loadError.message || 'Emergency places could not be loaded.');
      }
    }

    loadEmergencyPlaces();
    return () => {
      active = false;
      overpassController?.abort();
      if (emergencyServicesLayer.current) {
        map.removeLayer(emergencyServicesLayer.current);
        emergencyServicesLayer.current = null;
      }
      if (potentialSitesLayer.current) {
        map.removeLayer(potentialSitesLayer.current);
        potentialSitesLayer.current = null;
      }
    };
  }, [mapReady, selectable]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || emergencyPlacesStatus !== 'available') return;
    if (externalLayerState.emergencyServices) emergencyServicesLayer.current?.addTo(map);
    else if (emergencyServicesLayer.current) map.removeLayer(emergencyServicesLayer.current);
    if (externalLayerState.potentialSites) potentialSitesLayer.current?.addTo(map);
    else if (potentialSitesLayer.current) map.removeLayer(potentialSitesLayer.current);
  }, [emergencyPlacesStatus, externalLayerState.emergencyServices, externalLayerState.potentialSites, mapReady]);

  useEffect(() => {
    const map = mapInstance.current;
    const layer = barangayLayer.current;
    if (!map || !layer || hdxStatus !== 'available') return;
    if (externalLayerState.hdx) layer.addTo(map);
    else map.removeLayer(layer);
  }, [externalLayerState.hdx, hdxStatus, mapReady]);

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
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        !CALAPAN_BOUNDS.contains([latitude, longitude])) return;

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
          !CALAPAN_BOUNDS.contains([latitude, longitude])) {
        return;
      }

      const point = [latitude, longitude];
      points.push(point);
      L.marker(point, { icon: markerIcon(report.status, report.severity_level) })
        .bindPopup(popupContent(report))
        .addTo(layer);
    });

    if (points.length > 0 && !hasFittedReports.current) {
      map.fitBounds(points, { padding: [36, 36], maxZoom: 15 });
      hasFittedReports.current = true;
    } else if (points.length === 0 && !hasFittedReports.current) {
      map.setView(CALAPAN_CENTER, 13);
    }
  }, [visibleReports]);

  const statusLegend = [
    ['verified', 'Verified'],
    ['pending', 'Pending'],
    ['disputed', 'Disputed'],
  ];
  const placeCounts = emergencyPlaces.reduce((counts, feature) => {
    const category = feature.properties.category;
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  const serviceCount = emergencyPlaces.filter(
    (feature) => feature.properties.category !== 'potential_evacuation_site'
  ).length;
  const potentialSiteCount = placeCounts.potential_evacuation_site || 0;
  const facilityLegend = ['hospital', 'clinic', 'police', 'fire_station', 'evacuation_center']
    .filter((category) => placeCounts[category]);
  const externalToggleCount = [
    hdxStatus === 'available' && externalLayerState.hdx,
    Boolean(weather?.current && externalLayerState.weather),
    emergencyPlacesStatus === 'available' && externalLayerState.emergencyServices,
    emergencyPlacesStatus === 'available' && externalLayerState.potentialSites,
  ].filter(Boolean).length;

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
              ? 'Choose a location within Calapan City to look up its address.'
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

      <div className="relative z-0 isolate">
        <div ref={mapElement} className={`hazard-leaflet-map ${height}`} />
        {!selectable && mapReady && externalLayerState.weather && weather?.current && (
          <Suspense fallback={null}>
            <WeatherMapAnimation
              map={mapInstance.current}
              maxBounds={CALAPAN_BOUNDS}
              weather={weather}
            />
          </Suspense>
        )}
        {!selectable && (
          <div className="absolute right-3 top-3 z-[500]">
            <button
              type="button"
              onClick={() => setExternalLayersOpen((current) => !current)}
              className="rounded-full border border-slate-700 bg-slate-950/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-200 shadow-lg backdrop-blur-sm"
            >
              Layers ({externalToggleCount})
            </button>
            {externalLayersOpen && (
              <div className="mt-2 w-64 rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl">
                {[
                  ...(weather?.current ? [['weather', 'Live weather animation']] : []),
                  ['emergencyServices', `Emergency services${emergencyPlacesStatus === 'available' ? ` (${serviceCount})` : ''}`],
                  ['potentialSites', `Possible evacuation sites${emergencyPlacesStatus === 'available' ? ` (${potentialSiteCount})` : ''}`],
                  ['hdx', 'HDX barangay boundaries'],
                ].map(([key, label]) => (
                  <label key={key} className="mb-2 flex cursor-pointer items-center justify-between gap-3 text-[11px] text-slate-200 last:mb-0">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(externalLayerState[key])}
                      disabled={
                        (key === 'hdx' && hdxStatus !== 'available') ||
                        (['emergencyServices', 'potentialSites'].includes(key) && emergencyPlacesStatus !== 'available') ||
                        (key === 'potentialSites' && potentialSiteCount === 0)
                      }
                      title={
                        key === 'hdx' && hdxStatus !== 'available'
                          ? hdxError || 'Loading the regional boundary dataset.'
                          : ['emergencyServices', 'potentialSites'].includes(key) && emergencyPlacesStatus !== 'available'
                            ? emergencyPlacesError || 'Loading Calapan emergency places.'
                            : key === 'potentialSites' && potentialSiteCount === 0
                              ? 'No potential sites are listed in this snapshot.'
                              : undefined
                      }
                      onChange={() => setExternalLayerState((current) => ({ ...current, [key]: !current[key] }))}
                      className="h-4 w-4 accent-emerald-500"
                    />
                  </label>
                ))}
                <p className={`mt-2 border-t border-slate-800 pt-2 text-[9px] leading-4 ${
                  hdxStatus === 'available' && emergencyPlacesStatus === 'available'
                    ? 'text-emerald-200/80'
                    : 'text-amber-200/80'
                }`}>
                  {hdxStatus === 'loading'
                    ? 'Loading the Calapan-only HDX boundary dataset…'
                    : hdxStatus === 'available'
                      ? 'Barangay boundaries: UN OCHA HDX · COD-AB PHL.'
                      : hdxError || 'Regional boundary data is unavailable.'}
                </p>
                <p className={`mt-2 text-[9px] leading-4 ${
                  emergencyPlacesStatus === 'available' ? 'text-slate-300' : 'text-amber-200/80'
                }`}>
                  {emergencyPlacesStatus === 'loading'
                    ? 'Loading Calapan emergency places…'
                    : emergencyPlacesStatus === 'available'
                      ? (
                        <>
                          Emergency listings: {placeCounts.hospital || 0} hospitals · {placeCounts.clinic || 0} clinics · {placeCounts.police || 0} police · {placeCounts.fire_station || 0} fire stations · {placeCounts.evacuation_center || 0} designated evacuation centers. Fire contacts and the BFP pin need confirmation; {potentialSiteCount} possible evacuation sites are unverified and should be confirmed with Calapan City DRRMO.{' '}
                          <a
                            href="https://www.openstreetmap.org/copyright"
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2"
                          >
                            © OpenStreetMap contributors
                          </a>
                          {emergencyPlacesError && (
                            <span className="mt-1 block text-amber-200/80">{emergencyPlacesError}</span>
                          )}
                        </>
                      )
                      : emergencyPlacesError || 'Emergency place data is unavailable.'}
                </p>
              </div>
            )}
          </div>
        )}
        {!selectable && (
          <div className={`pointer-events-none absolute right-3 z-[500] rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl transition-[top] duration-200 sm:right-5 ${
            externalLayersOpen ? 'hidden' : 'top-14'
          }`}>
            <p className="mb-2 text-xs font-bold text-white">Map Legend</p>
            <div className="space-y-2 text-[10px] text-slate-300">
              {statusLegend.map(([status, label]) => (
                <p key={status} className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white shadow" style={{ backgroundColor: STATUS_COLORS[status] }}>
                    <AlertTriangle className="h-3 w-3 text-white" />
                  </span>
                  {label}
                </p>
              ))}
              {hdxStatus === 'available' && externalLayerState.hdx && (
                <p className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 border border-orange-400 bg-orange-400/20" />
                  Barangay boundary
                </p>
              )}
              {emergencyPlacesStatus === 'available' &&
                externalLayerState.emergencyServices &&
                facilityLegend.map((category) => {
                  const marker = EMERGENCY_PLACE_STYLES[category];
                  return (
                    <p key={category} className="flex items-center gap-2">
                      <span
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white text-[8px] font-bold text-white"
                        style={{ backgroundColor: marker.color }}
                      >
                        {marker.symbol}
                      </span>
                      {marker.label}
                    </p>
                  );
                })}
              {emergencyPlacesStatus === 'available' &&
                externalLayerState.potentialSites &&
                potentialSiteCount > 0 && (
                  <p className="flex items-center gap-2">
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white text-[8px] font-bold text-white"
                      style={{ backgroundColor: EMERGENCY_PLACE_STYLES.potential_evacuation_site.color }}
                    >
                      {EMERGENCY_PLACE_STYLES.potential_evacuation_site.symbol}
                    </span>
                    Possible site (unverified)
                  </p>
                )}
            </div>
          </div>
        )}
        {!selectable && (
          <div className="absolute bottom-10 left-3 z-[500] rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-[10px] text-slate-300 sm:bottom-3">
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
          <div className="absolute bottom-20 left-1/2 z-[500] w-[min(90%,24rem)] -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950/95 p-4 text-center shadow-xl sm:bottom-14">
            <p className="text-sm font-semibold text-slate-200">
              {mapData.coordinates_available ? 'No mapped hazard reports yet' : 'Map locations need database setup'}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {mapData.coordinates_available
                ? 'New reports with a selected map location will appear here. No sample markers are shown.'
                : 'This database is missing latitude and longitude columns. Apply migration 003 or the SQL update in the backend README to enable report locations.'}
            </p>
          </div>
        )}
        {!loading && error && (
          <div className="absolute bottom-20 left-1/2 z-[600] w-[min(90%,24rem)] -translate-x-1/2 rounded-xl border border-rose-500/30 bg-slate-950/95 p-4 text-center shadow-xl sm:bottom-14">
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
