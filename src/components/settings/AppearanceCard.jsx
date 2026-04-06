import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Sun, Moon, Pipette } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#1b4332', '#2d3436',
  '#2c3e50', '#6b2d8b', '#8b2252', '#b34700', '#7a5c00',
];

const MODE_OPTIONS = [
  { value: 'light',  label: 'Light',  icon: Sun,     preview: '#f4f5f7' },
  { value: 'dark',   label: 'Dark',   icon: Moon,    preview: '#141822' },
  { value: 'custom', label: 'Custom', icon: Pipette, preview: null },
];

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function luminance({ r, g, b }) {
  const c = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function isDarkColor(hex) { return luminance(hexToRgb(hex)) < 0.35; }

export default function AppearanceCard() {
  const { theme, setTheme, resolveBg } = useTheme();
  const [customInput, setCustomInput] = useState(theme.customColor || '#4a90e2');

  const currentBg = resolveBg(theme);
  const dark = isDarkColor(currentBg);

  const handleModeChange = (mode) => {
    if (mode === 'custom') {
      setTheme({ mode, customColor: customInput });
    } else {
      setTheme({ mode });
    }
  };

  const handleCustomColor = (color) => {
    setCustomInput(color);
    if (theme.mode === 'custom') {
      setTheme({ mode: 'custom', customColor: color });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="w-4 h-4" /> Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Mode selector */}
        <div>
          <p className="text-sm font-medium mb-2">Background Color</p>
          <div className="grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map(({ value, label, icon: Icon, preview }) => {
              const active = theme.mode === value;
              return (
                <button
                  key={value}
                  onClick={() => handleModeChange(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-xs font-medium',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {preview ? (
                    <div
                      className="w-8 h-8 rounded-lg border border-border/60 shadow-sm flex items-center justify-center"
                      style={{ background: preview }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: isDarkColor(preview) ? '#fff' : '#333' }} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg border border-border/60 bg-muted flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom color controls */}
        {theme.mode === 'custom' && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Custom Color</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customInput}
                onChange={e => handleCustomColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
              />
              <input
                type="text"
                value={customInput}
                onChange={e => {
                  const v = e.target.value;
                  setCustomInput(v);
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) handleCustomColor(v);
                }}
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm font-mono"
                placeholder="#1a1a2e"
                maxLength={7}
              />
            </div>
            {/* Preset swatches */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Presets</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => handleCustomColor(color)}
                    style={{ background: color }}
                    className={cn(
                      'w-7 h-7 rounded-md border-2 transition-transform hover:scale-110',
                      customInput === color ? 'border-primary scale-110' : 'border-transparent'
                    )}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live preview */}
        <div>
          <p className="text-sm font-medium mb-2">Preview</p>
          <div
            className="rounded-xl overflow-hidden border border-border/50 shadow-sm transition-colors duration-200"
            style={{ background: currentBg }}
          >
            {/* Mock nav bar */}
            <div
              className="px-4 py-2.5 flex items-center justify-between border-b"
              style={{
                background: `${currentBg}cc`,
                borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              }}
            >
              <div className="flex gap-1.5">
                {[1,2,3].map(i => (
                  <div key={i} className="h-1.5 rounded-full" style={{ width: i === 1 ? 32 : i === 2 ? 22 : 16, background: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }} />
                ))}
              </div>
              <div className="w-5 h-5 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
            </div>
            {/* Mock content */}
            <div className="p-3 space-y-2">
              {/* Mock card */}
              <div
                className="rounded-lg p-3 space-y-1.5"
                style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.75)', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}` }}
              >
                <div className="h-2 rounded-full w-24" style={{ background: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }} />
                <div className="h-1.5 rounded-full w-16" style={{ background: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }} />
                <div className="h-1.5 rounded-full w-20" style={{ background: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-6 rounded-md" style={{ background: 'hsl(var(--primary))', opacity: 0.85 }} />
                <div className="flex-1 h-6 rounded-md" style={{ background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />
              </div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}