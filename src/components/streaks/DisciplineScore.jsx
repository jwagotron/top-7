import React from 'react';
import { cn } from '@/lib/utils';

export default function DisciplineScore({ score }) {
  const color =
    score >= 80 ? 'text-secondary' :
    score >= 55 ? 'text-accent' :
    'text-destructive';

  const label =
    score >= 80 ? 'Elite Discipline' :
    score >= 65 ? 'Strong Athlete' :
    score >= 45 ? 'Building Habits' :
    'Getting Started';

  const circumference = 2 * Math.PI * 36;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={score >= 80 ? 'hsl(var(--secondary))' : score >= 55 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'}
            strokeWidth="7"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-2xl font-bold', color)}>{score}</span>
        </div>
      </div>
      <div className="text-center">
        <p className={cn('text-sm font-semibold', color)}>{label}</p>
        <p className="text-xs text-muted-foreground">Discipline Score</p>
      </div>
    </div>
  );
}