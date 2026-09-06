# Top 7 authentication repair

Date: September 6, 2026
Frontend diagnostic build: T7-AUTH-2026-09-06-3

## Confirmed findings

The existing email/password form called the login endpoint, not registration. In a browser test with a mocked successful existing-user response it opened the athlete dashboard without invoking registration. A rejected session reproduced a separate runtime bug: `liveToken is not defined` inside the session error handler. The previous lint configuration excluded `src/lib/**`, including that handler.

The previously inspected Android package has a built-in start address of `https://top-7.base44.app`. Both that host and `https://top-7.app` returned a valid Digital Asset Links association for package `com.base69c32a03dfe10b4cd6245abe.app` and the supplied Play signing fingerprint during this review. Seeing the Base44 address alone does not prove a separate account database or explain the entire login failure.

## Changes

- Centralized one-shot callback capture and current-session storage, including query and fragment callbacks. Password-reset tokens are kept separate.
- Replaced the broken session error path and added bounded verification, warm-resume handling, concurrent-request deduplication, and protection against an old response erasing a newer login.
- Removed reliance on an immutable bootstrap token after rejection or logout. The Base44 SDK client no longer closes over a permanently fixed constructor token.
- Kept existing-account login and new-account registration separate. Email whitespace is trimmed; passwords are not modified. Successful-looking responses without a session token are not accepted.
- Routed native Google initiation directly to the platform auth endpoint the inspected shell intercepts, with the return destination on the current app origin at `/`. No manual browser bridge, intent URL, custom-scheme token forwarding, or Play Store fallback was added.
- Made registration verify a real session after OTP confirmation, including platform responses that require a subsequent email/password login.
- Added safe local sign-in diagnostics and honest password-reset service errors. No tokens or token prefixes appear in the diagnostic panel.
- Included authentication modules in lint checking.

## Validation

Production build: PASS. ESLint: PASS. Whitespace check: PASS. Browser regression tests: 26/26 PASS. Browser used: headless Chromium. All authentication responses and app data calls in the final regression suite were mocked. No real user's password was entered and no user record was created, changed, reset, or deleted by these tests. Temporary browser-test dependencies were installed outside the application project.

These tests verify frontend behavior, NOT successful completion of live Google authentication in the Play-installed Android app. They do not exercise Android Auth Tab itself, the physical phone's installed version, or the actual credentials of the affected account. The final phone test is still required.

## Phone test

Publish the frontend in Base44. Force-close and reopen the installed Top 7 app. Test Continue with Google using the existing account. A brief secure Google browser screen is expected; the intended result is a return to the installed app with a verified session.

On failure, expand Sign-in details and capture the build identifier, environment, app address, callback-received flag, server status, and support code. Do not send a password or a callback URL containing a token.

- T7-NO-CALLBACK: the frontend did not receive a Google session. Cancellation or native browser return needs investigation.
- T7-SESSION-401: the returned session was rejected by session verification.
- T7-SESSION-403: a session was received but access was refused.
- T7-SESSION-NETWORK or a 5xx status: the service could not complete verification.

## Regression results

- PASS: Existing email login never registers; password bytes are preserved
- PASS: Invalid password stays on login with guidance, not signup
- PASS: Credential acceptance does not bypass failed session verification
- PASS: Query callback logs existing user in on top-7.app
- PASS: Query callback logs existing user in on top-7.base44.app
- PASS: Fragment callback survives one-shot clear flag
- PASS: Legacy saved clear flag cannot delete a newly returned session
- PASS: Fresh callback retry recovers without ReferenceError
- PASS: Rejected callback stops with a visible error and no resurrection
- PASS: 403 does not erase identity or grant access
- PASS: Network/server failures end in a retry state, not endless login
- PASS: Warm WebView resume consumes a returned token without reload
- PASS: Warm URL callback is captured via same-document navigation
- PASS: Old 401 cannot delete a newer successful session
- PASS: Clearing a session while verification is pending prevents late login
- PASS: Native Google entry /login uses shell endpoint and same-origin root
- PASS: Native Google entry /register uses shell endpoint and same-origin root
- PASS: Web Google entry keeps the branded web origin
- PASS: Password reset tokens are not mistaken for login sessions
- PASS: Duplicate email signup remains explicit and never logs in automatically
- PASS: OTP completion validates a session without token in verify response
- PASS: OTP completion validates a session with token in verify response
- PASS: No callback is diagnosed instead of an unexplained repeat login
- PASS: Reset request network failure does not pretend email was sent
- PASS: Login stays usable when token storage writes fail
- PASS: A successful-looking response without a token cannot reuse an old session
