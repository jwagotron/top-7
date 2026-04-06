import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'enduroflow_theme';

// ── helpers ────────────────────────────────────────────────────────────────

/** Parse any hex color to { r, g, b } */
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Perceived luminance 0–1 */
function luminance({ r, g, b }) {
  const c = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Lighten or darken a hex color by amount (-1 to 1) */
function adjustColor(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const nr = clamp(r + amount * 255);
  const ng = clamp(g + amount * 255);
  const nb = clamp(b + amount * 255);
  return `#${[nr, ng, nb].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Convert hex to "H S% L%" string for CSS hsl() */
function hexToHsl(hex) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Build full CSS variable set from a background hex color */
function buildTokens(bgHex) {
  const rgb = hexToRgb(bgHex);
  const lum = luminance(rgb);
  const isDark = lum < 0.35;

  const bgHsl = hexToHsl(bgHex);

  // Surface is slightly lighter/darker than bg
  const surfaceHex = adjustColor(bgHex, isDark ? 0.06 : -0.04);
  const surfaceHsl = hexToHsl(surfaceHex);

  // Muted is further offset
  const mutedHex = adjustColor(bgHex, isDark ? 0.1 : -0.08);
  const mutedHsl = hexToHsl(mutedHex);

  // Border
  const borderHex = adjustColor(bgHex, isDark ? 0.15 : -0.12);
  const borderHsl = hexToHsl(borderHex);

  // Foreground text
  const fgHsl = isDark ? '220 15% 95%' : '220 30% 10%';
  const mutedFgHsl = isDark ? '220 10% 55%' : '220 10% 45%';
  const cardFgHsl = fgHsl;

  // Sidebar is always darker
  const sidebarHex = adjustColor(bgHex, isDark ? -0.04 : -0.12);
  const sidebarHsl = hexToHsl(sidebarHex);
  const sidebarBorderHex = adjustColor(sidebarHex, isDark ? 0.08 : -0.08);
  const sidebarBorderHsl = hexToHsl(sidebarBorderHex);

  return {
    '--background': bgHsl,
    '--foreground': fgHsl,
    '--card': surfaceHsl,
    '--card-foreground': cardFgHsl,
    '--popover': surfaceHsl,
    '--popover-foreground': cardFgHsl,
    '--muted': mutedHsl,
    '--muted-foreground': mutedFgHsl,
    '--border': borderHsl,
    '--input': borderHsl,
    '--sidebar-background': sidebarHsl,
    '--sidebar-foreground': isDark ? '220 15% 85%' : '220 30% 15%',
    '--sidebar-border': sidebarBorderHsl,
    '--sidebar-accent': hexToHsl(adjustColor(sidebarHex, isDark ? 0.06 : -0.06)),
    '--sidebar-accent-foreground': isDark ? '220 15% 85%' : '220 30% 15%',
  };
}

const LIGHT_BG = '#f4f5f7';  // slightly warm white
const DARK_BG  = '#141822';  // near-black with slight blue tint

const DEFAULT_THEME = { mode: 'light', customColor: '#4a90e2' };

// ── context ────────────────────────────────────────────────────────────────

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  /** Apply CSS variables to :root */
  const applyTokens = useCallback((resolvedBg) => {
    const tokens = buildTokens(resolvedBg);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(tokens)) {
      root.style.setProperty(k, v);
    }
  }, []);

  /** Resolve the background hex from the current theme + system pref */
  const resolveBg = useCallback((t) => {
    if (t.mode === 'dark')   return DARK_BG;
    if (t.mode === 'light')  return LIGHT_BG;
    if (t.mode === 'custom') return t.customColor || '#ffffff';
    // system
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_BG : LIGHT_BG;
  }, []);

  const applyTheme = useCallback((t) => {
    const bg = resolveBg(t);
    applyTokens(bg);
    // Also toggle dark class for any components that rely on it
    const isDark = luminance(hexToRgb(bg)) < 0.35;
    document.documentElement.classList.toggle('dark', isDark);
    // Smooth transition
    document.documentElement.style.setProperty('--theme-transition', 'background-color 200ms ease, color 200ms ease, border-color 200ms ease');
  }, [resolveBg, applyTokens]);

  const setTheme = useCallback((newTheme) => {
    const merged = { ...theme, ...newTheme };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    setThemeState(merged);
    applyTheme(merged);
  }, [theme, applyTheme]);

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
  }, []);  // eslint-disable-line

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (theme.mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(theme);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolveBg }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}