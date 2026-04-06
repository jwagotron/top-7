import React from 'react';
import { cn } from '@/lib/utils';

// Colour palette for icon tile + gradient accent
const colorMap = {
  primary:     { icon: "bg-primary/15 text-primary",     glow: "shadow-primary/10",    from: "from-primary/8" },
  secondary:   { icon: "bg-secondary/15 text-secondary", glow: "shadow-secondary/10",  from: "from-secondary/8" },
  accent:      { icon: "bg-accent/15 text-accent",       glow: "shadow-accent/10",     from: "from-accent/8" },
  destructive: { icon: "bg-destructive/15 text-destructive", glow: "shadow-destructive/10", from: "from-destructive/8" },
};

export default function StatCard({ title, value, unit, icon: Icon, trend, color = "primary" }) {
  const c = colorMap[color] ?? colorMap.primary;

  return (
    <div className={cn(
      // Elevated primary card: brighter bg + directional gradient + stronger shadow
      "relative overflow-hidden rounded-2xl p-4 lg:p-5 flex flex-col min-w-0",
      "bg-card shadow-lg",
      c.glow,
      "border border-border/40",
      "transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] active:shadow-md"
    )}>
      {/* Subtle background gradient bloom */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none",
        c.from
      )} />

      <div className="relative flex items-start justify-between mb-4">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", c.icon)}>
          <Icon className="w-4 h-4" />
        </div>
        {trend != null && (
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
            trend > 0 ? "bg-secondary/15 text-secondary" : "bg-destructive/15 text-destructive"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      <p className="relative text-2xl lg:text-3xl font-bold tracking-tight leading-none text-foreground break-all">
        {value}
        {unit && <span className="text-xs font-normal text-muted-foreground/70 ml-1">{unit}</span>}
      </p>
      <p className="relative text-[11px] font-medium text-muted-foreground/60 mt-1.5 leading-tight truncate uppercase tracking-wide">{title}</p>
    </div>
  );
}