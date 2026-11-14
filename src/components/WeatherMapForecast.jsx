import React, { useEffect, useMemo, useState } from 'react';
import { Droplets, Wind } from 'lucide-react';
import { Lottie } from 'lottie-react';
import partlyCloudyAnimation from '../assets/weather/weather-partly-cloudy.json';
import partlyShowerAnimation from '../assets/weather/weather-partly-shower.json';
import stormAnimation from '../assets/weather/weather-storm.json';
import sunnyAnimation from '../assets/weather/weather-sunny.json';
import windyAnimation from '../assets/weather/weather-windy.json';
import { getCalapanForecastEffect, getCalapanWeatherEffect } from './CalapanWeather';

const WEATHER_ANIMATIONS = {
  'partly-cloudy': partlyCloudyAnimation,
  shower: partlyShowerAnimation,
  storm: stormAnimation,
  sunny: sunnyAnimation,
  windy: windyAnimation,
};

function animationForEffect(effect) {
  if (effect === 'storm') return 'storm';
  if (effect === 'rain' || effect === 'rain-wind') return 'shower';
  if (effect === 'wind') return 'windy';
  if (effect === 'sun') return 'sunny';
  return 'partly-cloudy';
}

function formatTime(value) {
  if (!value) return 'Next hour';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? 'Next hour'
    : date.toLocaleTimeString([], { hour: 'numeric' });
}

function formatTemperature(value) {
  return value == null || !Number.isFinite(Number(value))
    ? '—'
    : `${Math.round(Number(value))}°`;
}

function getForecastPeriods(weather) {
  if (!weather?.current) return [];

  const current = weather.current;
  const todayChance = weather.forecast?.[0]?.day?.daily_chance_of_rain ?? 0;
  return [
    {
      id: 'now',
      label: 'Now',
      time: current.last_updated,
      temp_c: current.temp_c,
      condition: current.condition,
      chance_of_rain: todayChance,
      wind_kph: current.wind_kph,
      isCurrent: true,
    },
    ...(weather.hourly || []).slice(0, 6).map((hour, index) => ({
      id: `hour-${hour.time_epoch || hour.time || index}`,
      label: formatTime(hour.time),
      time: hour.time,
      temp_c: hour.temp_c,
      condition: hour.condition,
      chance_of_rain: hour.chance_of_rain,
      isCurrent: false,
    })),
  ];
}

export default function WeatherMapForecast({ weather }) {
  const periods = useMemo(() => getForecastPeriods(weather), [weather]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('now');
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));

  useEffect(() => {
    setSelectedPeriodId('now');
  }, [weather?.current?.last_updated_epoch]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId) || periods[0];
  if (!selectedPeriod) return null;

  const effect = selectedPeriod.isCurrent
    ? getCalapanWeatherEffect(weather)
    : getCalapanForecastEffect(selectedPeriod);
  const animationName = animationForEffect(effect);
  const animationData = WEATHER_ANIMATIONS[animationName];
  const rainChance = Number(selectedPeriod.chance_of_rain || 0);
  const hasWind = selectedPeriod.wind_kph != null && Number.isFinite(Number(selectedPeriod.wind_kph));
  const condition = selectedPeriod.condition?.text || 'Weather forecast';

  return (
    <>
      <div
        aria-hidden="true"
        className={`weather-map-effect weather-map-effect--${effect || 'cloud'}`}
      />
      <div className="pointer-events-none absolute inset-0 z-[450]">
        <section
          aria-label="Animated Calapan weather forecast"
          className="pointer-events-auto absolute left-12 top-3 w-[min(21rem,calc(100%-3.5rem))] overflow-hidden rounded-2xl border border-white/20 bg-slate-950/85 text-white shadow-2xl shadow-slate-950/40 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
              <Lottie
                key={animationName}
                src={animationData}
                autoplay={!reducedMotion}
                loop={!reducedMotion}
                className="h-full w-full"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-sky-200">
                Map forecast · {selectedPeriod.label}
              </p>
              <p className="mt-1 truncate text-sm font-bold">{condition}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-300">
                <span className="font-semibold text-white">{formatTemperature(selectedPeriod.temp_c)}</span>
                <span className="inline-flex items-center gap-1 text-sky-200">
                  <Droplets className="h-3 w-3" />
                  {selectedPeriod.isCurrent ? `${rainChance}% today` : `${rainChance}% rain`}
                </span>
                {hasWind && (
                  <span className="inline-flex items-center gap-1 text-teal-200">
                    <Wind className="h-3 w-3" />
                    {Number(selectedPeriod.wind_kph).toFixed(0)} km/h
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-slate-950/60 px-2 py-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {periods.map((period) => {
                const selected = period.id === selectedPeriod.id;
                return (
                  <button
                    key={period.id}
                    type="button"
                    aria-label={`Show ${period.isCurrent ? 'current' : 'forecast'} weather for ${period.label}`}
                    aria-pressed={selected}
                    onClick={() => setSelectedPeriodId(period.id)}
                    className={`min-w-[3.1rem] flex-1 rounded-lg px-2 py-1.5 text-center transition ${
                      selected
                        ? 'bg-sky-400/20 text-white ring-1 ring-sky-300/40'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                    }`}
                  >
                    <span className="block text-[9px] font-semibold">{period.label}</span>
                    <span className="mt-0.5 block text-[10px] font-bold">{formatTemperature(period.temp_c)}</span>
                  </button>
                );
              })}
            </div>
            <p className="px-1 pt-1 text-[9px] text-slate-500">
              Select a time to preview its animated weather on the map.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
