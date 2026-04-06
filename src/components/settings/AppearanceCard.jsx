import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  { hex: '#141822', label: 'Midnight' },
  { hex: '#0f1117', label: 'Obsidian' },
  { hex: '#0d1b2a', label: 'Navy' },
  { hex: '#1b4332', label: 'Forest' },
  { hex: '#1a1a2e', label: 'Indigo' },
  { hex: '#2d1b4e', label: 'Plum' },
  { hex: '#3b1f14', label: 'Espresso' },
  { hex: '#1c1c1c', label: 'Charcoal' },
  { hex: '#f4f5f7', label: 'Snow' },
  { hex: '#faf7f2', label: 'Cream' },
  { hex: '#f0f4f8', label: 'Cloud' },
  { hex: '#e8f4f8', label: 'Ice' },
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

function MiniPreview({ bg }) {
  const dark = isDarkColor(bg);
  const surface = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)';
  const text = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const textMuted = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
  const border = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <div className="rounded-xl overflow-hidden border border-border/40 shadow-md" style={{ background: bg }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: border, background: dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.4)' }}>
        <div className="flex gap-1.5">
          <div className="w-5 h-1.5 rounded-full" style={{ background: text }} />
          <div className="w-3.5 h-1.5 rounded-full" style={{ background: textMuted }} />
          <div className="w-4 h-1.5 rounded-full" style={{ background: textMuted }} />
        </div>
        <div className="w-4 h-4 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
      </div>
      {/* Content */}
      <div className="p-2.5 space-y-2">
        <div className="rounded-lg p-2.5" style={{ background: surface, border: `1px solid ${border}` }}>
          <div className="w-16 h-1.5 rounded-full mb-1.5" style={{ background: text }} />
          <div className="w-10 h-1 rounded-full mb-1" style={{ background: textMuted }} />
          <div className="w-12 h-1 rounded-full" style={{ background: textMuted }} />
        </div>
        <div className="flex gap-1.5">
          <div className="flex-1 h-5 rounded-md" style={{ background: 'hsl(var(--primary))', opacity: 0.9 }} />
          <div className="flex-1 h-5 rounded-md" style={{ background: surface, border: `1px solid ${border}` }} />
        </div>
      </div>
    </div>
  );
}

export default function AppearanceCard() {
  const { theme, setTheme, resolveBg } = useTheme();
  const [customInput, setCustomInput] = useState(theme.customColor || '#141822');

  const currentBg = resolveBg(theme);

  const handlePreset = (hex) => {
    setCustomInput(hex);
    setTheme({ mode: 'custom', customColor: hex });
  };

  const handleCustomHex = (val) => {
    setCustomInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setTheme({ mode: 'custom', customColor: val });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Theme mode toggle */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Theme</p>
          <div className="flex gap-2">
            {[
              { value: 'light', label: 'Light', icon: Sun,  bg: '#f4f5f7' },
              { value: 'dark',  label: 'Dark',  icon: Moon, bg: '#141822' },
            ].map(({ value, label, icon: Icon, bg }) => {
              const active = theme.mode === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme({ mode: value })}
                  className={cn(
                    'flex-1 relative rounded-xl overflow-hidden border-2 transition-all duration-200',
                    active ? 'border-primary shadow-md shadow-primary/20' : 'border-border hover:border-primary/40'
                  )}
                >
                  {/* Preview swatch */}
                  <div className="h-16 flex items-center justify-center" style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color: isDarkColor(bg) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }} />
                  </div>
                  <div className={cn(
                    'py-1.5 text-xs font-medium text-center transition-colors',
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                  )}>
                    {label}
                  </div>
                  {active && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color presets */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Color Presets</p>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map(({ hex, label }) => {
              const active = theme.mode === 'custom' && theme.customColor === hex;
              return (
                <button
                  key={hex}
                  onClick={() => handlePreset(hex)}
                  title={label}
                  className={cn(
                    'aspect-square rounded-lg border-2 transition-all duration-150 hover:scale-110',
                    active ? 'border-primary scale-110 shadow-md' : 'border-transparent hover:border-border'
                  )}
                  style={{ background: hex }}
                />
              );
            })}
          </div>
        </div>

        {/* Custom hex input */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Custom Color</p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="color"
                value={customInput}
                onChange={e => handleCustomHex(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer opacity-0 absolute inset-0"
              />
              <div
                className="w-10 h-10 rounded-lg border-2 border-border shadow-sm cursor-pointer"
                style={{ background: customInput }}
              />
            </div>
            <input
              type="text"
              value={customInput}
              onChange={e => handleCustomHex(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm font-mono tracking-wider"
              placeholder="#141822"
              maxLength={7}
            />
            <button
              onClick={() => setTheme({ mode: 'custom', customColor: customInput })}
              className={cn(
                'h-9 px-4 rounded-md text-xs font-medium transition-colors',
                theme.mode === 'custom' && theme.customColor === customInput
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Preview</p>
          <MiniPreview bg={currentBg} />
        </div>

      </CardContent>
    </Card>
  );
}