import { useState, useEffect } from 'react';

const STORAGE_KEY = 'enduroflow_units';

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

  const KM_TO_MI = 0.621371;

  // km → display unit
  const toDisplay = (km) => {
    if (km == null) return null;
    return units === 'mi' ? Math.round(km * KM_TO_MI * 100) / 100 : Math.round(km * 100) / 100;
  };

  // display unit → km (for storing user input back to DB)
  const toKm = (val) => {
    if (val == null) return null;
    return units === 'mi' ? Math.round((val / KM_TO_MI) * 100) / 100 : val;
  };

  // Convert pace string "M:SS /km" → "M:SS /mi" (or vice-versa) for display only
  const convertPaceLabel = (paceStr) => {
    if (!paceStr) return paceStr;
    if (units !== 'mi') return paceStr;
    // If it's a bare "M:SS" string (no unit), convert sec/km → sec/mi
    const match = paceStr.match(/^(\d+):(\d{2})/);
    if (!match) return paceStr;
    const secPerKm = parseInt(match[1]) * 60 + parseInt(match[2]);
    const secPerMi = Math.round(secPerKm / KM_TO_MI);
    const m = Math.floor(secPerMi / 60);
    const s = String(secPerMi % 60).padStart(2, '0');
    // Replace the M:SS part but preserve anything after it
    return paceStr.replace(/^\d+:\d{2}/, `${m}:${s}`);
  };

  // Convert pace in sec/km → sec/mi for display
  const convertSecPerKm = (secPerKm) => {
    if (!secPerKm) return secPerKm;
    return units === 'mi' ? Math.round(secPerKm / KM_TO_MI) : secPerKm;
  };

  // Format sec/km or sec/mi as "M:SS /unit"
  const formatPace = (secPerKm) => {
    if (!secPerKm) return '--';
    const sec = units === 'mi' ? Math.round(secPerKm / KM_TO_MI) : secPerKm;
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s} ${paceLabel}`;
  };

  const label = units === 'mi' ? 'mi' : 'km';
  const paceLabel = units === 'mi' ? '/mi' : '/km';

  // elevation: meters → feet
  const toDisplayElevation = (meters) => {
    if (meters == null) return null;
    return units === 'mi' ? Math.round(meters * 3.28084) : meters;
  };
  const elevationLabel = units === 'mi' ? 'ft' : 'm';

  return {
    units, setUnits,
    toDisplay, toKm,
    label, paceLabel,
    convertPaceLabel, convertSecPerKm, formatPace,
    toDisplayElevation, elevationLabel,
  };
}