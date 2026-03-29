import React from 'react';
import { cn } from '@/lib/utils';

const TIERS = [
  { min: 85, label: 'Elite',          color: 'hsl(var(--secondary))',  textCls: 'text-secondary' },
  { min: 70, label: 'Strong',         color: 'hsl(var(--primary))',    textCls: 'text-primary' },
  { min: 50, label: 'Developing',     color: 'hsl(var(--accent))',     textCls: 'text-accent' },
  { min: 0,  label: 'Getting started',color: 'hsl(var(--muted-foreground))', textCls: 'text-muted-foreground' },
];

function getTier(score) {
  return TIERS.find(t => score >= t.min) || TIERS[TIERS.length - 1];
}

export default function DisciplineScore({ score }) {
  const tier = getTier(score);
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 80 80">
          {/* Track */}
          <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          {/* Progress */}
          <circle
            cx="40" cy="40" r={r} fill="none"
            stroke={tier.color}
            strokeWidth="6"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-2xl font-bold tabular-nums leading-none', tier.textCls)}>{score}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <p className={cn('text-sm font-semibold', tier.textCls)}>{tier.label}</p>
        <p className="text-xs text-muted-foreground">Discipline Score</p>
      </div>
    </div>
  );
}