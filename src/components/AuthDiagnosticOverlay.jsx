import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { detectRuntime } from '@/lib/runtimeDetect';
import { appParams } from '@/lib/app-params';

/**
 * Diagnostic overlay for Android/Capacitor auth debugging.
 * Shows real-time auth state, runtime environment, and the actual error from base44.auth.me().
 */
export default function AuthDiagnosticOverlay() {
  const [visible, setVisible] = useState(true);
  const [authState, setAuthState] = useState({});
  const { isLoadingAuth, isAuthenticated, authErrorMessage, hasToken } = useAuth();
  const runtime = detectRuntime();

  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('base44_access_token') || localStorage.getItem('token');
      const sessionActive = localStorage.getItem('base44_session_active');
      const localRole = localStorage.getItem('app_local_role');
      setAuthState({
        hasToken: !!token,
        tokenPreview: token ? `${token.slice(0, 8)}…${token.slice(-4)}` : 'none',
        tokenLength: token ? token.length : 0,
        sessionActive: !!sessionActive,
        localRole,
        pathname: window.location.pathname,
        origin: window.location.origin,
        appId: appParams.appId || 'NOT SET',
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  const isWebView = runtime.isWebView || runtime.isCapacitor;
  const runtimeColor = runtime.isCapacitor ? 'text-green-400' : runtime.isWebView ? 'text-green-400' : runtime.type === 'chrome_custom_tab' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-slate-900/95 text-white text-xs rounded-lg shadow-2xl p-3 backdrop-blur-sm border border-slate-700 max-w-md mx-auto">
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
        <div>Runtime: <span className={runtimeColor}>{runtime.label}</span></div>
        <div>Path: <span className="text-cyan-300">{authState.pathname}</span></div>
        <div>Origin: <span className="text-cyan-300">{authState.origin}</span></div>
        <div>AppId: <span className="text-cyan-300">{authState.appId}</span></div>
        <div>Token: <span className={authState.hasToken ? 'text-green-400' : 'text-red-400'}>{authState.hasToken ? `YES (${authState.tokenLength}ch ${authState.tokenPreview})` : 'NONE'}</span></div>
        <div>Session: <span className={authState.sessionActive ? 'text-yellow-400' : 'text-red-400'}>{authState.sessionActive ? 'MARKED' : 'NONE'}</span></div>
        <div>LocalRole: <span className="text-cyan-300">{authState.localRole || 'none'}</span></div>
        <div className="pt-1 border-t border-slate-700 mt-1">
          <div>Loading: <span className={isLoadingAuth ? 'text-yellow-400' : 'text-slate-400'}>{isLoadingAuth ? 'YES' : 'NO'}</span></div>
          <div>Authed: <span className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>{isAuthenticated ? 'YES' : 'NO'}</span></div>
          <div>HasToken(ctx): <span className={hasToken ? 'text-green-400' : 'text-red-400'}>{hasToken ? 'YES' : 'NO'}</span></div>
        </div>
        {authErrorMessage && (
          <div className="pt-1 border-t border-slate-700 mt-1">
            <div className="text-red-400 font-bold">Error:</div>
            <div className="text-red-300 break-all">{authErrorMessage}</div>
          </div>
        )}
        <div className="pt-1 border-t border-slate-700 mt-1 text-slate-500 text-[10px]">
          UA: {runtime.userAgent}
        </div>
      </div>
    </div>
  );
}