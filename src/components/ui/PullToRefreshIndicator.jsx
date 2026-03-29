import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefreshIndicator({ pullDistance, threshold, refreshing }) {
  const progress = Math.min(pullDistance / threshold, 1);
  const ready = progress >= 1;

  if (!refreshing && pullDistance === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all"
      style={{ transform: `translateY(${refreshing ? 56 : pullDistance * 0.5}px)` }}
    >
      <div className="bg-card border border-border rounded-full p-2 shadow-md">
        <RefreshCw
          className={`w-5 h-5 text-primary transition-transform ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: `rotate(${progress * 360}deg)`, opacity: refreshing ? 1 : 0.4 + progress * 0.6 }}
        />
      </div>
    </div>
  );
}