/** Translate password-service errors without displaying or storing their raw payloads. */
export const PASSWORD_LOGIN_BUILD = 'T7-EMAIL-2026-09-07-1';

export function passwordErrorStatus(error) {
  return Number(error?.status || error?.response?.status || error?.originalError?.response?.status) || 0;
}

function responseText(error) {
  const values = [];
  const visit = (value, depth = 0) => {
    if (depth > 3) return;
    if (typeof value === 'string') values.push(value.slice(0, 600));
    else if (Array.isArray(value)) value.slice(0, 5).forEach(item => visit(item, depth + 1));
    else if (value && typeof value === 'object') {
      // Never inspect request config, form input, email/password fields or tokens.
      for (const key of ['code', 'message', 'detail', 'error', 'reason', 'type', 'msg', 'extra_data']) {
        if (Object.hasOwn(value, key)) visit(value[key], depth + 1);
      }
    }
  };
  visit(error?.data);
  visit(error?.response?.data);
  visit(error?.originalError?.response?.data);
  visit(error?.code);
  visit(error?.message);
  return values.join(' ').replace(/[_-]/g, ' ').toLowerCase();
}

export function describePasswordLoginError(error) {
  const status = passwordErrorStatus(error);
  const text = responseText(error);
  const failure = (code, message, recovery = false) => ({ status, code, message, recovery });

  if (error?.code === 'SESSION_NOT_VERIFIED') {
    return failure('T7-EMAIL-SESSION', 'Your sign-in response did not produce a verified session. Please use the support code below.');
  }
  if (status === 429) {
    return failure('T7-EMAIL-RATE-LIMIT', 'Too many sign-in attempts. Please wait a few minutes before trying again.');
  }
  if (!status || status >= 500) {
    return failure('T7-EMAIL-SERVICE', 'Top 7 could not reach the sign-in service. Please try again when your connection is stable.');
  }
  if (/turnstile|captcha|bot protection|challenge (required|failed)|security check/.test(text)) {
    return failure('T7-EMAIL-SECURITY-CHECK', 'The email sign-in service requires a security check that this form could not complete. Continue with Google is still available.');
  }
  if (/password.{0,45}(disabled|not enabled|not allowed|not supported)|username.{0,20}password.{0,20}disabled/.test(text)) {
    return failure('T7-EMAIL-DISABLED', 'Email and password sign-in is not enabled for this app. Continue with Google and share this support code with the app administrator.');
  }
  if (/sign\s?in with google|log\s?in with google|password.{0,30}(not set|has not been set)|social.{0,30}(only|account)|google.{0,25}only/.test(text)) {
    return failure('T7-EMAIL-SIGNIN-METHOD', 'The service says this account uses a different sign-in method. Continue with Google, or request password recovery to check whether password access is available.', true);
  }
  if (/email.{0,25}(not verified|unverified)|verify your email|email verification (required|pending)/.test(text)) {
    return failure('T7-EMAIL-VERIFY', 'The sign-in service requires email verification. Complete the verification email before signing in with a password.');
  }
  if (status === 401 || /invalid.{0,30}(email|password|credential)|incorrect.{0,30}(email|password|credential)|wrong.{0,30}(email|password|credential)|(email|password|credential).{0,35}(invalid|incorrect)|user not found|account not found/.test(text)) {
    // The service may intentionally give the same response for several account states.
    // Do not infer that an email exists or that the user necessarily mistyped.
    return failure('T7-EMAIL-CREDENTIALS', 'Top 7 could not verify that email and password. Use your Top 7 password, or reset it for the same email. Do not create another account.', true);
  }
  if (status === 422 || /field required|valid email|validation error/.test(text)) {
    return failure('T7-EMAIL-INPUT', 'The sign-in service could not accept the form values. Check the email address and password fields and try again.');
  }
  if (status === 403) {
    return failure('T7-EMAIL-ACCESS', 'The sign-in service refused access. Use the original sign-in method and share the support code below.');
  }
  return failure(`T7-EMAIL-${status}`, `The email sign-in service rejected this request (HTTP ${status}). The app cannot determine the reason from this response. Please share the support code below.`, true);
}

/** Recovery must not claim an email was sent after an arbitrary failed request. */
export function describeRecoveryError(error) {
  const status = passwordErrorStatus(error);
  const text = responseText(error);
  // Preserve account-existence privacy for the platform's explicit no-user responses.
  if ((status === 400 || status === 404) && /user not found|account not found|email not found|no account|not registered/.test(text)) return null;
  if (status === 429) return 'Please wait a few minutes before requesting another reset link.';
  if (!status || status >= 500) return 'The reset service could not be reached. Please try again.';
  if (/google|social|password.{0,25}(not set|not supported|disabled)/.test(text)) return 'Password recovery is not available for this sign-in method. Continue with Google instead.';
  if (/captcha|turnstile|security check/.test(text)) return 'The reset service requires a security check. Continue with Google for now and report this problem.';
  return 'The reset request could not be completed. Check the email address and try again. No reset email was confirmed.';
}
