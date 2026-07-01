import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// SDK Token Flow (verified from SDK source):
// 1. createClient({ token }) → createAxiosClient sets
//    axios.defaults.headers.common["Authorization"] = `Bearer ${token}` at creation time.
// 2. At init, the SDK calls userAuthModule.setToken(token || getAccessToken()) —
//    getAccessToken() reads from localStorage["base44_access_token"] (same key Login.jsx saves to).
// 3. The ONLY way to update the token after creation is base44.auth.setToken(newToken),
//    which updates axios.defaults.headers.common["Authorization"] directly.
// 4. There is NO per-request interceptor that re-reads from localStorage.
//
// The token passed here (appParams.token) is read from localStorage at module init.
// If it's stale/null on Android WebView cold starts, AuthContext.jsx calls
// base44.auth.setToken(getLiveToken()) before base44.auth.me() to force-update
// the axios Authorization header with the freshest token from localStorage.

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});