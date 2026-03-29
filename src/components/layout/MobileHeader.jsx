import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const ROOT_PATHS = new Set(['/', '/workouts', '/plans', '/settings', '/analytics', '/goals', '/messages', '/activities', '/shoes', '/garmin', '/coach', '/workout-builder', '/admin']);

export default function MobileHeader({ title }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isNested = !ROOT_PATHS.has(location.pathname);

  if (!isNested) return null;

  return (
    <div
      className="lg:hidden flex items-center gap-2 px-4 py-3 bg-card border-b border-border sticky top-0 z-30"
      style={{ paddingTop: `calc(env(safe-area-inset-top) + 0.75rem)` }}
    >
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm font-medium text-primary select-none"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>
      {title && <span className="text-sm font-semibold ml-2">{title}</span>}
    </div>
  );
}