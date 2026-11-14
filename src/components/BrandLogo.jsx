import React from 'react';
import logo from '../assets/bayanalert-logo.png';

export function BrandLogo({ className = '' }) {
  return (
    <img
      src={logo}
      alt="BayanAlert"
      className={`object-contain ${className}`}
    />
  );
}
