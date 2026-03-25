import React from 'react';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, unit, icon: Icon, trend, color = "primary" }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent/10 text-accent",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="bg-card rounded-2xl p-5 border border-border hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-semibold px-2 py-1 rounded-full",
            trend > 0 ? "bg-secondary/10 text-secondary" : "bg-destructive/10 text-destructive"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span></p>
      <p className="text-xs text-muted-foreground mt-1">{title}</p>
    </div>
  );
}