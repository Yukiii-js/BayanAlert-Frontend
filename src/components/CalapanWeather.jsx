import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Loader2,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';
import { api } from '../api/client';

const WEATHER_POLL_INTERVAL = 10 * 60 * 1000;
const LAST_WEATHER_KEY = 'bayanalert_calapan_weather_signature';
const ADVISORY_SHOWN_KEY = 'bayanalert_calapan_weather_advisory_shown';
const RAIN_CODES = new Set([
  1063, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198,
  1201, 1240, 1243, 1246, 1249, 1252, 1261, 1264,
]);
const STORM_CODES = new Set([1087, 1273, 1276, 1279, 1282]);

function conditionIcon(condition, isDay = true, className = 'h-10 w-10') {
  const code = Number(condition?.code);
  const text = String(condition?.text || '').toLowerCase();
  if (STORM_CODES.has(code) || text.includes('thunder')) {
    return <CloudLightning className={className} />;
  }
  if (RAIN_CODES.has(code) || text.includes('rain') || text.includes('drizzle')) {
    return <CloudRain className={className} />;
  }
  if (text.includes('fog') || text.includes('mist')) {
    return <CloudFog className={className} />;
  }
  if (text.includes('cloud')) {
    return isDay ? <CloudSun className={className} /> : <Cloud className={className} />;
  }
  return isDay ? <Sun className={className} /> : <Cloud className={className} />;
}

function weatherSignature(weather) {
  const current = weather.current || {};
  const chanceOfRain = Number(weather.forecast?.[0]?.day?.daily_chance_of_rain || 0);
  const nextRainPeriod = weather.hourly?.find((hour) => {
    const chance = Number(hour.chance_of_rain || 0);
    const text = String(hour.condition?.text || '').toLowerCase();
    return chance >= 60 || RAIN_CODES.has(Number(hour.condition?.code)) ||
      STORM_CODES.has(Number(hour.condition?.code)) || text.includes('rain') ||
      text.includes('drizzle') || text.includes('thunder');
  });
  return [
    current.condition?.code || 'unknown',
    current.is_day ? 'day' : 'night',
    Number(current.precip_mm) > 0 ? 'wet' : 'dry',
    Number(current.wind_kph) >= 35 ? 'windy' : 'calm',
    chanceOfRain >= 60 ? 'rain-likely' : 'rain-unlikely',
    nextRainPeriod?.time_epoch || 'no-near-rain',
  ].join(':');
}

function formatForecastTime(value) {
  if (!value) return 'soon';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function weatherReminder(weather) {
  const current = weather.current || {};
  const code = Number(current.condition?.code);
  const condition = String(current.condition?.text || 'Current conditions').trim();
  const conditionText = condition.toLowerCase();
  const rainChance = Number(weather.forecast?.[0]?.day?.daily_chance_of_rain || 0);
  const currentPrecipitation = Number(current.precip_mm || 0);
  const windSpeed = Number(current.wind_kph || 0);

  if (STORM_CODES.has(code) || conditionText.includes('thunder')) {
    return {
      title: 'Thunderstorms in Calapan now',
      message: `WeatherAPI reports ${condition}. Move indoors and avoid exposed areas.`,
    };
  }
  if (RAIN_CODES.has(code) || currentPrecipitation > 0 ||
      conditionText.includes('rain') || conditionText.includes('drizzle')) {
    return {
      title: 'Rain in Calapan now',
      message: `${condition}${currentPrecipitation > 0 ? ` · ${currentPrecipitation} mm precipitation reported` : ''}. Bring an umbrella.`,
    };
  }
  if (windSpeed >= 35) {
    return {
      title: 'Strong winds in Calapan',
      message: `WeatherAPI reports ${Math.round(windSpeed)} km/h winds. Secure loose items and take care outdoors.`,
    };
  }
  if (Number(current.temp_c) >= 34) {
    return {
      title: 'Hot weather in Calapan',
      message: `It is ${Math.round(Number(current.temp_c))}°C now. Drink water and limit prolonged sun exposure.`,
    };
  }

  const currentEpoch = Number(current.last_updated_epoch || 0);
  const upcomingRain = (weather.hourly || []).find((hour) => {
    const hourEpoch = Number(hour.time_epoch || 0);
    const hoursAhead = currentEpoch && hourEpoch
      ? (hourEpoch - currentEpoch) / 3600
      : Number.POSITIVE_INFINITY;
    const hourCode = Number(hour.condition?.code);
    const hourText = String(hour.condition?.text || '').toLowerCase();
    const hasRainCondition = RAIN_CODES.has(hourCode) || STORM_CODES.has(hourCode) ||
      hourText.includes('rain') || hourText.includes('drizzle') || hourText.includes('thunder');
    return hoursAhead >= 0 && hoursAhead <= 6 &&
      (Number(hour.chance_of_rain || 0) >= 60 || hasRainCondition);
  });

  if (upcomingRain) {
    const chance = Number(upcomingRain.chance_of_rain || 0);
    const expectedCondition = upcomingRain.condition?.text || 'rain';
    return {
      title: `${expectedCondition} forecast around ${formatForecastTime(upcomingRain.time)}`,
      message: `${chance > 0 ? `${chance}% chance of rain in Calapan. ` : 'WeatherAPI forecasts this condition in Calapan. '}Carry an umbrella if you will be out.`,
    };
  }

  if (rainChance >= 60) {
    return {
      title: 'Rain is possible in Calapan today',
      message: `WeatherAPI forecasts a ${rainChance}% chance of rain today. Consider carrying an umbrella.`,
    };
  }
  return null;
}

function dayLabel(date) {
  const parsedDate = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString(undefined, { weekday: 'short' });
}

export function CalapanWeather({
  onWeatherChange = () => {},
  showReminder = true,
  reminderEnabled = true,
}) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reminder, setReminder] = useState(null);
  const [reminderClosing, setReminderClosing] = useState(false);
  const [pendingReminder, setPendingReminder] = useState(null);
  const [refreshMessage, setRefreshMessage] = useState('');
  const reminderTimer = useRef(null);
  const closeTimer = useRef(null);
  const refreshMessageTimer = useRef(null);

  function dismissReminder() {
    if (!reminder || reminderClosing) return;
    window.clearTimeout(reminderTimer.current);
    window.clearTimeout(closeTimer.current);
    setReminderClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setReminder(null);
      setReminderClosing(false);
    }, 320);
  }

  async function loadWeather(showLoader = false) {
    if (showLoader) {
      setRefreshing(true);
      setRefreshMessage('');
      window.clearTimeout(refreshMessageTimer.current);
    }
    try {
      const response = await api.getCalapanWeather();
      const result = response?.data;
      if (!result?.current || !Array.isArray(result.forecast) || !Array.isArray(result.hourly)) {
        throw new Error('The Calapan forecast returned an invalid response.');
      }

      if (showReminder) {
        const previousSignature = sessionStorage.getItem(LAST_WEATHER_KEY);
        const nextSignature = weatherSignature(result);
        const advice = weatherReminder(result);
        if (sessionStorage.getItem(ADVISORY_SHOWN_KEY) !== '1') {
          if (advice && (!previousSignature || previousSignature !== nextSignature)) {
            setPendingReminder(advice);
          }
        }
        sessionStorage.setItem(LAST_WEATHER_KEY, nextSignature);
      }

      setWeather(result);
      onWeatherChange(result);
      setError('');
      if (showLoader) {
        setRefreshMessage('Weather updated');
        refreshMessageTimer.current = window.setTimeout(() => setRefreshMessage(''), 2500);
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to load Calapan weather.');
      if (showLoader) {
        setRefreshMessage('Update failed');
        refreshMessageTimer.current = window.setTimeout(() => setRefreshMessage(''), 2500);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadWeather();
    const timer = window.setInterval(() => loadWeather(), WEATHER_POLL_INTERVAL);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(reminderTimer.current);
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(refreshMessageTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!showReminder || !reminderEnabled || !pendingReminder || reminder) return;
    if (sessionStorage.getItem(ADVISORY_SHOWN_KEY) === '1') return;

    sessionStorage.setItem(ADVISORY_SHOWN_KEY, '1');
    setReminder(pendingReminder);
    setPendingReminder(null);
    setReminderClosing(false);
    window.clearTimeout(reminderTimer.current);
    reminderTimer.current = window.setTimeout(dismissReminder, 7000);
  }, [showReminder, reminderEnabled, pendingReminder, reminder]);

  const current = weather?.current;
  const forecast = weather?.forecast || [];
  const hourlyForecast = weather?.hourly || [];
  const todayForecast = forecast[0]?.day;
  const condition = current?.condition;

  return (
    <>
      <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <header className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <CloudSun className="h-5 w-5 shrink-0 text-amber-300" />
              Calapan weather
            </h2>
            <p className="mt-1 text-[10px] text-slate-400">
              Oriental Mindoro, Philippines
              {weather?.location?.localtime && ` · ${weather.location.localtime}`}
            </p>
          </div>
          <div className="flex min-w-[4.25rem] flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => loadWeather(true)}
              disabled={loading || refreshing}
              aria-label="Refresh weather forecast"
              className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-emerald-500/40 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {refreshMessage && (
              <span
                role="status"
                aria-live="polite"
                className={`whitespace-nowrap text-[9px] ${refreshMessage === 'Weather updated' ? 'text-emerald-300' : 'text-rose-300'}`}
              >
                {refreshMessage}
              </span>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-xs text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-emerald-400" />
            Loading Calapan forecast...
          </div>
        ) : error && !weather ? (
          <div className="flex flex-1 flex-col justify-center p-4 sm:p-5">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-100">Live forecast unavailable</p>
                  <p className="mt-1 text-[10px] leading-5 text-slate-400">
                    {error.includes('not configured')
                      ? 'Add your WeatherAPI.com key to the backend .env file to enable Calapan weather.'
                      : error}
                  </p>
                  {error.includes('not configured') && (
                    <p className="mt-2 break-all rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2 font-mono text-[9px] text-emerald-300">
                      WEATHERAPI_KEY=your_weatherapi_key
                    </p>
                  )}
                  <p className="mt-2 text-[9px] leading-4 text-slate-500">
                    Keep the key in BayanAlert-Backend/.env; do not put it in the frontend.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadWeather(true)}
                disabled={refreshing}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-500/40 hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                Retry weather
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-between gap-4 p-4">
            {error && (
              <p role="status" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] text-amber-200">
                Refresh failed; showing the last forecast.
              </p>
            )}

            <div className="flex items-center gap-3">
              <span className="shrink-0 text-amber-300">
                {conditionIcon(condition, Boolean(current?.is_day), 'h-12 w-12')}
              </span>
              <div className="min-w-0">
                <p className="text-4xl font-light tracking-tight text-white">
                  {Number(current?.temp_c).toFixed(0)}
                  <span className="ml-1 text-xl">°C</span>
                </p>
                <p className="truncate text-xs font-medium text-slate-300">{condition?.text || 'Current conditions'}</p>
                <p className="text-[10px] text-slate-500">
                  Feels like {Number(current?.feelslike_c).toFixed(0)}°C
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                <p className="flex items-center gap-1 text-[9px] text-slate-500">
                  <Droplets className="h-3 w-3 text-sky-400" /> Rain chance
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-200">{todayForecast?.daily_chance_of_rain ?? 0}%</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                <p className="flex items-center gap-1 text-[9px] text-slate-500">
                  <Wind className="h-3 w-3 text-teal-300" /> Wind
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-200">{current?.wind_kph ?? '--'} km/h</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                <p className="flex items-center gap-1 text-[9px] text-slate-500">
                  <Thermometer className="h-3 w-3 text-rose-300" /> Humidity
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-200">{current?.humidity ?? '--'}%</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Next hours</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {hourlyForecast.slice(0, 6).map((hour) => (
                  <article key={hour.time_epoch} className="min-w-[3.2rem] flex-1 rounded-lg bg-slate-950/60 p-2 text-center">
                    <p className="text-[9px] text-slate-500">
                      {hour.time ? hour.time.slice(-5) : '--:--'}
                    </p>
                    <span className="my-1 flex justify-center text-amber-300">
                      {conditionIcon(hour.condition, true, 'h-4 w-4')}
                    </span>
                    <p className="text-[10px] font-semibold text-slate-200">
                      {Number(hour.temp_c).toFixed(0)}°
                    </p>
                  </article>
                ))}
                {!hourlyForecast.length && (
                  <p className="py-2 text-[10px] text-slate-500">Hourly forecast not available.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">3-day forecast</h3>
              <div className="grid grid-cols-3 gap-2">
                {forecast.map((item) => (
                  <article key={item.date} className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-center">
                    <p className="text-[10px] font-semibold text-slate-300">{dayLabel(item.date)}</p>
                    <span className="my-2 flex justify-center text-amber-300">
                      {conditionIcon(item.day?.condition, true, 'h-6 w-6')}
                    </span>
                    <p className="text-[9px] text-slate-400">
                      {Number(item.day?.maxtemp_c).toFixed(0)}° / {Number(item.day?.mintemp_c).toFixed(0)}°
                    </p>
                    <p className="mt-1 flex items-center justify-center gap-1 text-[9px] text-sky-300">
                      <Droplets className="h-2.5 w-2.5" />
                      {item.day?.daily_chance_of_rain ?? 0}%
                    </p>
                  </article>
                ))}
              </div>
            </div>
            <p className="text-right text-[9px] text-slate-500">
              Weather data by WeatherAPI.com
              {current?.last_updated && ` · Updated ${current.last_updated}`}
            </p>
          </div>
        )}
      </section>

      {reminder && (
        <div
          role="status"
          aria-live="polite"
          className={`weather-reminder fixed right-4 top-1/2 z-[1100] flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-sky-400/30 bg-slate-900/95 p-3 text-slate-100 shadow-2xl backdrop-blur ${
            reminderClosing ? 'weather-reminder--closing' : ''
          }`}
        >
          <span className="mt-0.5 shrink-0 text-sky-300">
            {conditionIcon(condition, Boolean(current?.is_day), 'h-5 w-5')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">{reminder.title}</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-300">{reminder.message}</p>
          </div>
          <button
            type="button"
            onClick={dismissReminder}
            aria-label="Dismiss weather reminder"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

export function getCalapanWeatherEffect(weather) {
  if (!weather?.current) return '';
  const current = weather.current;
  const code = Number(current.condition?.code);
  const text = String(current.condition?.text || '').toLowerCase();
  if (STORM_CODES.has(code) || text.includes('thunder')) return 'storm';
  if (RAIN_CODES.has(code) || Number(current.precip_mm) > 0 || text.includes('rain')) {
    return Number(current.wind_kph) >= 35 ? 'rain-wind' : 'rain';
  }
  if (Number(current.wind_kph) >= 35) return 'wind';
  if (Number(current.is_day) === 1 && (text.includes('sun') || text.includes('clear'))) return 'sun';
  if (text.includes('cloud') || text.includes('overcast')) return 'cloud';
  return '';
}
