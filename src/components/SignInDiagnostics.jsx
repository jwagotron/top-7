import React, { useState } from 'react';
import { getAuthDiagnostics, getSessionToken } from '@/lib/authSession';
import { detectRuntime } from '@/lib/runtimeDetect';

/** Local-only troubleshooting. No email, password, token, or token prefix is shown. */
export default function SignInDiagnostics({ code }) {
  const [details, setDetails] = useState(null);
  const refresh = () => setDetails({ ...getAuthDiagnostics(), hasSession:Boolean(getSessionToken()), runtime:detectRuntime().label });
  return (
    <details className="mt-5 text-xs text-muted-foreground" onToggle={refresh}>
      <summary className="cursor-pointer py-2">Sign-in details</summary>
      {details && <div className="space-y-1 break-words rounded-lg border border-border p-3" aria-label="Sign-in diagnostics">
        <p>Build: {details.build}</p>
        <p>Environment: {details.runtime}</p>
        <p>App address: {details.origin}</p>
        <p>Step: {details.phase}</p>
        <p>Google callback received: {details.callbackSeen ? 'yes' : 'no'}</p>
        <p>Session available: {details.hasSession ? 'yes' : 'no'}</p>
        <p>Server status: {details.httpStatus || 'not checked'}</p>
        {code && <p>Support code: {code}</p>}
      </div>}
    </details>
  );
}
