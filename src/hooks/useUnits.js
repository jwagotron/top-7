import { useState, useEffect } from 'react';

const STORAGE_KEY = 'enduroflow_units';

export function useUnits() {
  const [units, setUnitsState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'km');

  const setUnits = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setUnitsState(value);
    window.dispatchEvent(new Event('units-changed'));
  };

  useEffect(() => {
    const handler = () => setUnitsState(localStorage.getItem(STORAGE_KEY) || 'km');
    window.addEventListener('units-changed', handler);
    return () => window.removeEventListener('units-changed', handler);
  }, []);

  const toDisplay = (km) => {
    if (km == null) return null;
    return units === 'mi' ? Math.round(km * 0.621371 * 100) / 100 : km;
  };

  const label = units === 'mi' ? 'mi' : 'km';
  const paceLabel = units === 'mi' ? '/mi' : '/km';

  return { units, setUnits, toDisplay, label, paceLabel };
}