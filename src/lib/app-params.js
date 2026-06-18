const isNode = typeof window === 'undefined';

// Safe storage wrapper — localStorage may be blocked in sandboxed iframes
let storageAvailable = false;
const storage = (() => {
  if (isNode) return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  try {
    window.localStorage.setItem('__test__', '1');
    window.localStorage.removeItem('__test__');
    storageAvailable = true;
    return window.localStorage;
  } catch {
    // Fallback to in-memory store — but we cannot persist across page loads
    const mem = new Map();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
  }
})();

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	// Only remove from URL if localStorage is available to persist the value
	if (removeFromUrl && storageAvailable) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	const token = getAppParamValue("access_token", { removeFromUrl: true });
	// Log token source for debugging Android/Capacitor auth issues
	const fromUrl = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('access_token');
	const fromStorage = storageAvailable ? storage.getItem('base44_access_token') : null;
	const sessionActive = storageAvailable ? storage.getItem('base44_session_active') : null;
	console.log('[params] token sources — fromUrl:', !!fromUrl, 'fromStorage:', !!fromStorage, 'sessionActive:', !!sessionActive, 'hasToken:', !!token);
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token,
		fromUrl: getAppParamValue("from_url", { defaultValue: typeof window !== 'undefined' ? window.location.href : '' }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}