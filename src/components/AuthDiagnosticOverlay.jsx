import React, { useState, useEffect } from 'react';

/**
 * Temporary diagnostic overlay for Android/Capacitor auth debugging.
 * Shows real-time auth state so testers can see what's happening.
 * Dismissible via the X button. Auto-hides after 30 seconds.
 */
export default function AuthDiagnosticOverlay() {
  const [visible, setVisible] = useState(true);
  const [authState, setAuthState] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('base44_access_token') || localStorage.getItem('token');
      const sessionActive = localStorage.getItem('base44_session_active');
      const localRole = localStorage.getItem('app_local_role');
      setAuthState({
        hasToken: !!token,
        tokenPreview: token ? `${token.slice(0, 8)}…${token.slice(-4)}` : 'none',
        sessionActive: !!sessionActive,
        localRole,
        pathname: window.location.pathname,
        origin: window.location.origin,
      });
    }, 500);

    const timer = setTimeout(() => setVisible(false), 30000);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-slate-900/95 text-white text-xs rounded-lg shadow-2xl p-3 backdrop-blur-sm border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-yellow-400">Auth Debug</span>
        <button
          onClick={() => setVisible(false)}
          className="text-slate-400 hover:text-white"
          aria-label="Close diagnostics"
        >
          ✕
        </button>
      </div>
      <div className="space-y-0.5 font-mono">
        <div>Path: <span className="text-cyan-300">{authState.pathname}</span></div>
        <div>Origin: <span className="text-cyan-300">{authState.origin}</span></div>
        <div>Token: <span className={authState.hasToken ? 'text-green-400' : 'text-red-400'}>{authState.hasToken ? `YES ${authState.tokenPreview}` : 'NONE'}</span></div>
        <div>Session: <span className={authState.sessionActive ? 'text-green-400' : 'text-red-400'}>{authState.sessionActive ? 'ACTIVE' : 'INACTIVE'}</span></div>
        <div>LocalRole: <span className="text-cyan-300">{authState.localRole || 'none'}</span></div>
      </div>
    </div>
  );
}