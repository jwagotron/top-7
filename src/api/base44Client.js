import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { getSessionToken } from '@/lib/authSession';

const { appId, functionsVersion, appBaseUrl } = appParams;

// app-params captures the callback before client construction. Let the SDK read
// current storage instead of closing over an immutable constructor token: some
// SDK modules prefer that constructor token even after a later account switch.
export const base44 = createClient({
  appId,
  functionsVersion,
  requiresAuth: false,
  appBaseUrl,
});

// Also support a callback kept in memory when storage is unavailable.
const initialToken = getSessionToken();
if (initialToken) base44.auth.setToken(initialToken);
