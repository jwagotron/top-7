/**
 * Runtime environment detection for Android/Capacitor debugging.
 * Detects whether the app is running in a regular browser, Android WebView,
 * or Capacitor/native shell.
 */

export function detectRuntime() {
  if (typeof window === 'undefined') return { type: 'ssr', label: 'SSR' };

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // Capacitor native shell injects window.Capacitor
  const isCapacitor = !!(window.Capacitor && window.Capacitor.isNative);

  // Android WebView vs Chrome browser. Common WebView UAs include `; wv)`,
  // a standalone `wv` token, or `Version/4.0 ... Chrome/...`. Base44-managed
  // shells are not guaranteed to expose the same Capacitor flags on every build,
  // so UA detection is an important fallback for installed Android apps.
  const isAndroidWebView = isAndroid && (
    /;\s*wv\)/i.test(ua)
    || /\bwv\b/i.test(ua)
    || /Version\/4\.0.*Chrome\//i.test(ua)
    || /WebView/i.test(ua)
  );
  const isChromeCustomTab = isAndroid && !isAndroidWebView && /Chrome/.test(ua) && !window.matchMedia('(display-mode: standalone)').matches;

  // iOS WKWebView
  const isIOSWebView = isIOS && !/Safari/.test(ua) && !window.MSStream;

  let type = 'browser';
  let label = 'Browser';

  if (isCapacitor) {
    type = 'capacitor';
    label = isAndroid ? 'Capacitor (Android)' : isIOS ? 'Capacitor (iOS)' : 'Capacitor';
  } else if (isAndroidWebView) {
    type = 'android_webview';
    label = 'Android WebView';
  } else if (isIOSWebView) {
    type = 'ios_webview';
    label = 'iOS WebView';
  } else if (isChromeCustomTab) {
    type = 'chrome_custom_tab';
    label = 'Chrome Custom Tab ⚠️';
  } else if (isAndroid) {
    type = 'android_browser';
    label = 'Android Browser';
  } else if (isIOS) {
    type = 'ios_browser';
    label = 'iOS Browser';
  }

  return {
    type,
    label,
    isAndroid,
    isIOS,
    isCapacitor,
    isWebView: isAndroidWebView || isIOSWebView,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    userAgent: ua.slice(0, 120),
  };
}