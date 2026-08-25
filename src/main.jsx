import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Android 15+ enforces edge-to-edge layouts for modern target SDKs. Some
// Android WebView/native shells still report env(safe-area-inset-top) as 0,
// which lets app chrome sit underneath the system status bar. Mark only the
// installed/native Android runtime so CSS can provide a conservative fallback
// without adding extra space in normal mobile browsers.
if (typeof window !== 'undefined') {
  const ua = navigator.userAgent || '';
  const cap = window.Capacitor;
  const isAndroid = /Android/i.test(ua);
  const isAndroidWebView = /; wv\)/i.test(ua) || /WebView/i.test(ua);

  let isNativeAndroid = false;
  if (isAndroid) {
    try {
      isNativeAndroid = typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform();
    } catch (_) {}
    try {
      isNativeAndroid = isNativeAndroid || (typeof cap?.getPlatform === 'function' && cap.getPlatform() === 'android');
    } catch (_) {}
    isNativeAndroid = isNativeAndroid || cap?.isNative === true || cap?.platform === 'android' || isAndroidWebView;
  }

  document.documentElement.classList.toggle('native-android', !!isNativeAndroid);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
