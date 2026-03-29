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
    <div className="bg-card rounded-2xl p-3 lg:p-5 border border-border hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-2 lg:mb-3">
        <div className={cn("w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center shrink-0", colorMap[color])}>
          <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
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
      <p className="text-xl lg:text-2xl font-bold tracking-tight leading-none">{value}<span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span></p>
      <p className="text-[10px] lg:text-xs text-muted-foreground mt-1 leading-tight">{title}</p>
    </div>
  );
}