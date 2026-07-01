import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// The SDK client is created once at module init with whatever token was in
// storage at that time. On Android WebView cold starts, the token from
// appParams may be stale. The SDK internally reads its token from localStorage
// on each request, so passing the initial token here is sufficient — it gets
// updated by loginViaEmailPassword / setToken calls.

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});