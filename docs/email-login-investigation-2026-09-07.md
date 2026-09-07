# Top 7 email/password investigation

Date: September 7, 2026
Email form build: T7-EMAIL-2026-09-07-1

## Evidence and limits

The supplied phone screenshot shows the email_login_failed step, no session, and HTTP 400. It does not include the backend response body. The current login form uses loginViaEmailPassword and does not call account registration.

One controlled login request to this app used a randomly generated address under reserved example.com and a synthetic password. The service returned HTTP 400 with message/detail: Invalid email or password. This confirms that the old generic 400 handling hid a real credential-rejection response. It does NOT establish the exact reason for the user's actual attempt. No real account password was used, changed, or reset.

Reading current auth toggles through the CLI was unavailable without separate CLI authentication, so no configuration claim or change was made. The previously working Google flow, AuthContext, token handling, SDK client, signing certificate and provider settings were left unchanged.

## Changes

- Added safe classification of error bodies for credential rejection, disabled password login, a security challenge, required email verification, another sign-in method, service/rate limits, and unknown failures. Raw server payloads are not shown or persisted.
- Added explicit support codes to the email form and live-updating diagnostic details.
- Added an accessible Show/Hide password control without modifying, storing, or logging the password.
- Made the login error readable in dark mode.
- Added a same-email recovery link, passing email through local router state rather than a URL, without submitting a reset request until the user clicks Send reset link.
- Stopped reporting arbitrary failed password-reset requests as successful. Explicit no-account responses still receive neutral, non-enumerating wording.

## Validation

Production build: PASS. ESLint: PASS. Whitespace checks: PASS.
36 browser regression scenarios passed using simulated backend responses; 16 standalone classification/privacy checks passed. The actual affected account's password login remains unverified. Mocked successful logins do not prove real credentials will be accepted by Base44.

The source comparison against d4782c5 confirmed no changes to googleLogin.js, AuthContext.jsx, authSession.js, app-params.js, or base44Client.js.

## Next step

Publish the updated frontend, reopen the installed app, and retry email login once. The Sign-in details panel should include Email form: T7-EMAIL-2026-09-07-1. If the service returns T7-EMAIL-CREDENTIALS, use Forgot password for the same account, complete the newest recovery email, and retry with the newly set Top 7 password. For another result, report only the support code, with password visibility turned off. Do not create a duplicate account or alter Google signing/OAuth settings.

## Browser regression outcomes

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
- PASS: HTTP 400 gives a specific safe reason: T7-EMAIL-CREDENTIALS
- PASS: HTTP 400 gives a specific safe reason: T7-EMAIL-SECURITY-CHECK
- PASS: HTTP 400 gives a specific safe reason: T7-EMAIL-DISABLED
- PASS: HTTP 400 gives a specific safe reason: T7-EMAIL-SIGNIN-METHOD
- PASS: HTTP 400 gives a specific safe reason: T7-EMAIL-VERIFY
- PASS: HTTP 400 gives a specific safe reason: T7-EMAIL-400
- PASS: Password visibility toggle preserves input and does not submit
- PASS: Recovery keeps the same email, with no password or email in the URL
- PASS: An unexplained reset HTTP 400 is not reported as an email sent
- PASS: Explicit no-account recovery response preserves account privacy
