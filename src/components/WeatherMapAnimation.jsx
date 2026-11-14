import { useEffect } from 'react';
import L from 'leaflet';
import lottie from 'lottie-web';
import partlyCloudyAnimation from '../assets/weather/weather-partly-cloudy.json';
import partlyShowerAnimation from '../assets/weather/weather-partly-shower.json';
import stormAnimation from '../assets/weather/weather-storm.json';
import sunnyAnimation from '../assets/weather/weather-sunny.json';
import windyAnimation from '../assets/weather/weather-windy.json';
import { getCalapanWeatherEffect } from './CalapanWeather';

const WEATHER_ANIMATIONS = {
  cloud: partlyCloudyAnimation,
  rain: partlyShowerAnimation,
  storm: stormAnimation,
  sun: sunnyAnimation,
  wind: windyAnimation,
};

const PARTICLES = [
  { u: 0.16, v: 0.2, size: 88, east: 0.0024, north: 0.0003 },
  { u: 0.72, v: 0.28, size: 96, east: 0.0019, north: -0.0004 },
  { u: 0.34, v: 0.76, size: 80, east: 0.0027, north: 0.0002 },
  { u: 0.84, v: 0.68, size: 92, east: 0.0016, north: -0.0003 },
];

const COMPASS_BEARINGS = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
};

function animationForEffect(effect) {
  if (effect === 'storm') return 'storm';
  if (effect === 'rain' || effect === 'rain-wind') return 'rain';
  if (effect === 'wind') return 'wind';
  if (effect === 'sun') return 'sun';
  return 'cloud';
}

function getVisibleBounds(map, maximum) {
  const visible = map.getBounds();
  const south = Math.max(visible.getSouth(), maximum.getSouth());
  const north = Math.min(visible.getNorth(), maximum.getNorth());
  const west = Math.max(visible.getWest(), maximum.getWest());
  const east = Math.min(visible.getEast(), maximum.getEast());

  if (north <= south || east <= west) {
    return {
      south: maximum.getSouth(),
      north: maximum.getNorth(),
      west: maximum.getWest(),
      east: maximum.getEast(),
    };
  }

  const latitudePadding = (north - south) * 0.08;
  const longitudePadding = (east - west) * 0.08;
  return {
    south: south + latitudePadding,
    north: north - latitudePadding,
    west: west + longitudePadding,
    east: east - longitudePadding,
  };
}

function setParticlePosition(particle, bounds) {
  const latitude = bounds.south + particle.v * (bounds.north - bounds.south);
  const longitude = bounds.west + particle.u * (bounds.east - bounds.west);
  particle.marker.setLatLng([latitude, longitude]);

  const edgeDistance = Math.min(particle.u, 1 - particle.u, particle.v, 1 - particle.v);
  const edgeOpacity = Math.min(1, edgeDistance / 0.12);
  const element = particle.marker.getElement();
  if (element) element.style.opacity = String(edgeOpacity);
}

function copyAnimationData(animation) {
  return JSON.parse(JSON.stringify(animation));
}

export default function WeatherMapAnimation({ map, maxBounds, weather }) {
  const effect = getCalapanWeatherEffect(weather);
  const animationName = animationForEffect(effect);
  const animationData = WEATHER_ANIMATIONS[animationName];
  const hasCurrentWeather = Boolean(weather?.current);
  const windBearing = COMPASS_BEARINGS[String(weather?.current?.wind_dir || '').toUpperCase()];

  useEffect(() => {
    if (!map || !hasCurrentWeather || !animationData) return undefined;
    if (!maxBounds) throw new Error('The Leaflet weather animation bounds are missing.');

    const pane = map.getPane('weatherAnimationPane');
    if (!pane) throw new Error('The Leaflet weather animation pane is missing.');

    const layer = L.layerGroup().addTo(map);
    let bounds = getVisibleBounds(map, maxBounds);
    const windFlow = Number.isFinite(windBearing) ? windBearing + 180 : 180;
    const windRadians = (windFlow * Math.PI) / 180;
    const eastDirection = Math.sin(windRadians);
    const northDirection = Math.cos(windRadians);
    const eastMultiplier = Math.abs(eastDirection) < 0.25 ? 0.35 : eastDirection;
    const northMultiplier = Math.abs(northDirection) < 0.25 ? 0.2 : northDirection;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles = [];
    const animations = [];

    PARTICLES.forEach((config, index) => {
      const icon = L.divIcon({
        className: 'weather-lottie-marker',
        html: `<div class="weather-lottie-marker__float${index % 2 ? ' weather-lottie-marker__float--slow' : ''}"><div class="weather-lottie-marker__animation"></div></div>`,
        iconSize: [config.size, config.size],
        iconAnchor: [config.size / 2, config.size / 2],
      });
      const marker = L.marker([0, 0], {
        pane: 'weatherAnimationPane',
        icon,
        interactive: false,
        keyboard: false,
      }).addTo(layer);
      const markerElement = marker.getElement();
      const animationContainer = markerElement?.querySelector('.weather-lottie-marker__animation');
      if (!animationContainer) {
        animations.forEach((animation) => animation.destroy());
        layer.remove();
        throw new Error('A Leaflet weather animation marker could not be mounted.');
      }
      animations.push(lottie.loadAnimation({
        container: animationContainer,
        renderer: 'svg',
        loop: !reducedMotion,
        autoplay: !reducedMotion,
        animationData: copyAnimationData(animationData),
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      }));

      const particle = {
        ...config,
        marker,
        east: config.east * eastMultiplier,
        north: config.north * northMultiplier,
      };
      particles.push(particle);
      setParticlePosition(particle, bounds);
    });

    function updateBounds() {
      bounds = getVisibleBounds(map, maxBounds);
      particles.forEach((particle) => setParticlePosition(particle, bounds));
    }

    map.on('moveend zoomend resize', updateBounds);

    let animationFrame = 0;
    let previousFrame = 0;
    function drift(timestamp) {
      animationFrame = window.requestAnimationFrame(drift);
      if (timestamp - previousFrame < 1000 / 30) return;

      const elapsedSeconds = Math.min((timestamp - previousFrame) / 1000, 0.1);
      previousFrame = timestamp;
      particles.forEach((particle) => {
        particle.u = (particle.u + particle.east * elapsedSeconds + 1) % 1;
        particle.v = (particle.v + particle.north * elapsedSeconds + 1) % 1;
        setParticlePosition(particle, bounds);
      });
    }
    animationFrame = window.requestAnimationFrame(drift);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      map.off('moveend zoomend resize', updateBounds);
      animations.forEach((animation) => animation.destroy());
      layer.remove();
    };
  }, [map, maxBounds, animationData, hasCurrentWeather, windBearing]);

  return null;
}
