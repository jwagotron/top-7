import React, { useState } from 'react';
import { LOGO_URL, APP_NAME } from '@/lib/branding';

/**
 * Renders the Top 7 logo image.
 * Falls back to a branded "T7" badge if the image fails to load.
 * className is applied to the outer container.
 */
export default function AppLogo({ className = 'w-9 h-9', rounded = 'rounded-xl' }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={`${className} ${rounded} bg-primary flex items-center justify-center shrink-0 select-none`}
        aria-label={APP_NAME}
      >
        <span className="text-primary-foreground font-black text-xs leading-none tracking-tight">T7</span>
      </div>
    );
  }

  return (
    <div className={`${className} ${rounded} overflow-hidden shrink-0 bg-sidebar-accent`}>
      <img
        src={LOGO_URL}
        alt={APP_NAME}
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}