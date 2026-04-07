import { useState, useEffect } from 'react';

const STORAGE_KEY = 'enduroflow_units';
const KM_TO_MI = 0.621371;

export function useUnits() {
  const [units, setUnitsState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'mi');

  const setUnits = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setUnitsState(value);
    window.dispatchEvent(new Event('units-changed'));
  };

  useEffect(() => {
    const handler = () => setUnitsState(localStorage.getItem(STORAGE_KEY) || 'mi');
    window.addEventListener('units-changed', handler);
    return () => window.removeEventListener('units-changed', handler);
  }, []);

  const label = units === 'mi' ? 'mi' : 'km';
  const paceLabel = units === 'mi' ? '/mi' : '/km';
  const elevationLabel = units === 'mi' ? 'ft' : 'm';

  const toDisplay = (km) => {
    if (km == null) return null;
    return units === 'mi' ? Math.round(km * KM_TO_MI * 100) / 100 : Math.round(km * 100) / 100;
  };

  const toKm = (val) => {
    if (val == null) return null;
    return units === 'mi' ? Math.round((val / KM_TO_MI) * 100) / 100 : val;
  };

  const convertPaceLabel = (paceStr) => {
    if (!paceStr) return paceStr;
    if (units !== 'mi') return paceStr;
    const match = paceStr.match(/^(\d+):(\d{2})/);
    if (!match) return paceStr;
    const secPerKm = parseInt(match[1]) * 60 + parseInt(match[2]);
    const secPerMi = Math.round(secPerKm / KM_TO_MI);
    const m = Math.floor(secPerMi / 60);
    const s = String(secPerMi % 60).padStart(2, '0');
    return paceStr.replace(/^\d+:\d{2}/, `${m}:${s}`);
  };

  const convertSecPerKm = (secPerKm) => {
    if (!secPerKm) return secPerKm;
    return units === 'mi' ? Math.round(secPerKm / KM_TO_MI) : secPerKm;
  };

  const formatPace = (secPerKm) => {
    if (!secPerKm) return '--';
    const sec = units === 'mi' ? Math.round(secPerKm / KM_TO_MI) : secPerKm;
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s} ${paceLabel}`;
  };

  const toDisplayElevation = (meters) => {
    if (meters == null) return null;
    return units === 'mi' ? Math.round(meters * 3.28084) : meters;
  };

  return {
    units, setUnits,
    toDisplay, toKm,
    label, paceLabel,
    convertPaceLabel, convertSecPerKm, formatPace,
    toDisplayElevation, elevationLabel,
  };
}