import React, { useEffect, useState } from 'react';
import { Lottie } from 'lottie-react';
import partlyCloudyAnimation from '../assets/weather/weather-partly-cloudy.json';
import partlyShowerAnimation from '../assets/weather/weather-partly-shower.json';
import stormAnimation from '../assets/weather/weather-storm.json';
import sunnyAnimation from '../assets/weather/weather-sunny.json';
import windyAnimation from '../assets/weather/weather-windy.json';
import { getCalapanWeatherEffect } from './CalapanWeather';

const ANIMATIONS = {
  cloud: partlyCloudyAnimation,
  rain: partlyShowerAnimation,
  storm: stormAnimation,
  sun: sunnyAnimation,
  wind: windyAnimation,
};

const FLOATING_LAYOUTS = {
  cloud: [
    { animation: 'cloud', className: 'left-[18%] top-[12%] w-28 sm:w-36', opacity: 0.42, delay: '-2s' },
    { animation: 'cloud', className: 'right-[14%] top-[34%] w-24 sm:w-32', opacity: 0.32, delay: '-5s' },
  ],
  rain: [
    { animation: 'rain', className: 'left-[18%] top-[12%] w-28 sm:w-36', opacity: 0.46, delay: '-1s' },
    { animation: 'cloud', className: 'right-[14%] top-[34%] w-24 sm:w-32', opacity: 0.34, delay: '-4s' },
    { animation: 'rain', className: 'left-[52%] bottom-[5%] w-20 sm:w-28', opacity: 0.27, delay: '-6s' },
  ],
  storm: [
    { animation: 'storm', className: 'left-[18%] top-[12%] w-28 sm:w-36', opacity: 0.42, delay: '-1s' },
    { animation: 'rain', className: 'right-[14%] top-[34%] w-24 sm:w-32', opacity: 0.34, delay: '-4s' },
  ],
  sun: [
    { animation: 'sun', className: 'left-[18%] top-[12%] w-28 sm:w-36', opacity: 0.4, delay: '-2s' },
    { animation: 'cloud', className: 'right-[14%] top-[34%] w-24 sm:w-32', opacity: 0.3, delay: '-5s' },
  ],
  wind: [
    { animation: 'wind', className: 'left-[18%] top-[12%] w-28 sm:w-36', opacity: 0.4, delay: '-2s' },
    { animation: 'cloud', className: 'right-[14%] top-[34%] w-24 sm:w-32', opacity: 0.3, delay: '-5s' },
  ],
};

function animationForEffect(effect) {
  if (effect === 'storm') return 'storm';
  if (effect === 'rain' || effect === 'rain-wind') return 'rain';
  if (effect === 'wind') return 'wind';
  if (effect === 'sun') return 'sun';
  return 'cloud';
}

export default function WeatherMapForecast({ weather }) {
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  if (!weather?.current?.condition) return null;

  const effect = getCalapanWeatherEffect(weather) || 'cloud';
  const animationType = animationForEffect(effect);
  const floatingAnimations = FLOATING_LAYOUTS[animationType];

  return (
    <>
      <div
        aria-hidden="true"
        className={`weather-map-effect weather-map-effect--${effect}`}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[450] overflow-hidden">
        {floatingAnimations.map((item, index) => (
          <div
            key={`${item.animation}-${index}`}
            className={`weather-map-animation-floater ${item.className}`}
            style={{ animationDelay: item.delay, opacity: item.opacity }}
          >
            <Lottie
              src={ANIMATIONS[item.animation]}
              autoplay={!reducedMotion}
              loop={!reducedMotion}
              speed={0.7}
              className="h-full w-full"
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </>
  );
}
