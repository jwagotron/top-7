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
    <div className="bg-card rounded-2xl p-3 lg:p-5 border border-border hover:shadow-lg transition-all duration-300 flex flex-col min-w-0">
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
            trend > 0 ? "bg-secondary/10 text-secondary" : "bg-destructive/10 text-destructive"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-lg lg:text-2xl font-bold tracking-tight leading-tight break-all">{value}<span className="text-[10px] lg:text-xs font-normal text-muted-foreground ml-1">{unit}</span></p>
      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight truncate">{title}</p>
    </div>
  );
}