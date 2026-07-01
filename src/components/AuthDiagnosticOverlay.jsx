import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { detectRuntime } from '@/lib/runtimeDetect';
import { appParams } from '@/lib/app-params';
import { getOAuthDiagnostics, isNativePlatform } from '@/lib/capacitorAuth';

/**
 * Diagnostic overlay for Android/Capacitor auth debugging.
 * Shows real-time auth state, runtime environment, OAuth flow status,
 * and the actual error from base44.auth.me().
 */
export default function AuthDiagnosticOverlay() {
  const [visible, setVisible] = useState(true);
  const [authState, setAuthState] = useState({});
  const [oauthDiag, setOauthDiag] = useState(getOAuthDiagnostics());
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
      setOauthDiag(getOAuthDiagnostics());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  const isWebView = runtime.isWebView || runtime.isCapacitor;
  const runtimeColor = runtime.isCapacitor ? 'text-green-400' : runtime.isWebView ? 'text-green-400' : runtime.type === 'chrome_custom_tab' ? 'text-red-400' : 'text-yellow-400';

  const val = (cond) => cond ? 'text-green-400' : 'text-red-400';

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-slate-900/95 text-white text-xs rounded-lg shadow-2xl p-3 backdrop-blur-sm border border-slate-700 max-w-md mx-auto max-h-[80vh] overflow-y-auto">
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
        {/* Runtime */}
        <div>Runtime: <span className={runtimeColor}>{runtime.label}</span></div>
        <div>Native: <span className={val(isNativePlatform())}>{isNativePlatform() ? 'TRUE' : 'FALSE'}</span></div>
        <div>Path: <span className="text-cyan-300">{authState.pathname}</span></div>
        <div>Origin: <span className="text-cyan-300">{authState.origin}</span></div>
        <div>AppId: <span className="text-cyan-300">{authState.appId}</span></div>

        {/* Token / Session */}
        <div className="pt-1 border-t border-slate-700 mt-1">Token: <span className={val(authState.hasToken)}>{authState.hasToken ? `YES (${authState.tokenLength}ch ${authState.tokenPreview})` : 'NONE'}</span></div>
        <div>Session: <span className={val(authState.sessionActive)}>{authState.sessionActive ? 'MARKED' : 'NONE'}</span></div>
        <div>LocalRole: <span className="text-cyan-300">{authState.localRole || 'none'}</span></div>

        {/* Auth state */}
        <div className="pt-1 border-t border-slate-700 mt-1">Loading: <span className={isLoadingAuth ? 'text-yellow-400' : 'text-slate-400'}>{isLoadingAuth ? 'YES' : 'NO'}</span></div>
        <div>Authed: <span className={val(isAuthenticated)}>{isAuthenticated ? 'YES' : 'NO'}</span></div>
        <div>HasToken(ctx): <span className={val(hasToken)}>{hasToken ? 'YES' : 'NO'}</span></div>

        {/* OAuth flow diagnostics */}
        <div className="pt-1 border-t border-slate-700 mt-1 font-bold text-yellow-400">OAuth Flow:</div>
        <div>Redirect URL: <span className="text-cyan-300 break-all">{oauthDiag.redirectUrl || '—'}</span></div>
        <div>OAuth URL set: <span className={val(oauthDiag.oauthUrl)}> {oauthDiag.oauthUrl ? 'YES' : 'NO'}</span></div>
        <div>Browser opened: <span className={val(oauthDiag.browserOpened)}>{oauthDiag.browserOpened ? 'YES' : 'NO'}</span></div>
        <div>Callback received: <span className={val(oauthDiag.callbackReceived)}>{oauthDiag.callbackReceived ? 'YES' : 'NO'}</span></div>
        <div>Token extracted: <span className={val(oauthDiag.tokenExtracted)}>{oauthDiag.tokenExtracted ? 'YES' : 'NO'}</span></div>
        <div>Token stored: <span className={val(oauthDiag.tokenStored)}>{oauthDiag.tokenStored ? 'YES' : 'NO'}</span></div>
        <div>auth.me: <span className={oauthDiag.authMeResult?.startsWith('success') ? 'text-green-400' : oauthDiag.authMeResult?.startsWith('failed') ? 'text-red-400' : 'text-slate-400'}>{oauthDiag.authMeResult || 'pending'}</span></div>

        {/* Errors */}
        {authErrorMessage && (
          <div className="pt-1 border-t border-slate-700 mt-1">
            <div className="text-red-400 font-bold">Auth Error:</div>
            <div className="text-red-300 break-all">{authErrorMessage}</div>
          </div>
        )}
        {oauthDiag.lastError && (
          <div className="pt-1">
            <div className="text-red-400 font-bold">OAuth Error:</div>
            <div className="text-red-300 break-all">{oauthDiag.lastError}</div>
          </div>
        )}
        <div className="pt-1 border-t border-slate-700 mt-1 text-slate-500 text-[10px]">
          UA: {runtime.userAgent}
        </div>
      </div>
    </div>
  );
}