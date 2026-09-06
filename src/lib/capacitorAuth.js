/**
 * Native-shell detection used by the auth diagnostic overlay.
 *
 * Google OAuth should not be opened manually from the hosted app. Base44's
 * installed mobile shell intercepts the normal Base44 auth navigation and
 * owns the secure native Auth Tab lifecycle, including returning the final
 * authenticated URL to the app WebView.
 */

function getCapacitor() {
  return typeof window !== 'undefined' ? window.Capacitor : undefined;
}

export function isNativePlatform() {
  if (typeof window === 'undefined') return false;

  // Base44's React Native hybrid shell injects these bridges into hosted apps.
  if (window.ReactNativeWebView || window.wixMobileNativeBridge) return true;

  const cap = getCapacitor();
  if (!cap) return false;

  try {
    if (typeof cap.isNativePlatform === 'function') {
      return !!cap.isNativePlatform();
    }
  } catch (_) {}

  try {
    if (typeof cap.getPlatform === 'function') {
      const platform = cap.getPlatform();
      return platform === 'android' || platform === 'ios';
    }
  } catch (_) {}

  if (cap.isNative === true) return true;
  return cap.platform === 'android' || cap.platform === 'ios';
}
