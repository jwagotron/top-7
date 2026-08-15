# Top 7 Custom Google OAuth

This app is prepared for Base44 custom Google OAuth so Google sign-in can display Top 7 branding instead of Base44 branding.

## Google Auth Platform values

- App name: `Top 7`
- Homepage: `https://top-7.app/`
- Privacy policy: `https://top-7.app/privacy`
- Terms of service: `https://top-7.app/terms`
- Support page: `https://top-7.app/support`
- Authorized domain: `top-7.app`
- Authorized JavaScript origin: `https://top-7.app`
- Authorized redirect URI: `https://app.base44.com/api/apps/auth/callback`
- Audience: External, unless Top 7 is intentionally limited to one Google Workspace organization

## OAuth scopes

Use only the scopes required by Base44 login:

- `openid`
- `https://www.googleapis.com/auth/userinfo.email`

Do not add Gmail, Drive, Calendar, Contacts, or other Google API scopes to the login client unless the product explicitly needs them later.

## Branding

Upload the same Top 7 logo used by the application. The OAuth app name and logo should match the public Top 7 homepage. Add current developer/support contact information in Google Cloud.

## Base44 authentication setting

In Base44 Dashboard > Settings > Authentication:

1. Enable Google authentication.
2. Select `Use a custom OAuth from Google Console`.
3. Enter the Google OAuth Client ID and Client Secret from the Google Cloud OAuth client.
4. Save/update the authentication settings.

The client secret belongs in Base44's protected authentication settings. Never commit it to source control or put it in frontend code.

## Verification

Verify ownership of `top-7.app` in Google Search Console using a Google account that is an owner/editor of the Google Cloud project. Complete Google brand verification and publish the verified branding so the Top 7 app name/logo are shown to users.

## App-side readiness

Top 7 exposes these public pages without requiring authentication:

- `/` product homepage
- `/privacy`
- `/terms`
- `/support`
- `/delete-account`

The privacy policy contains a dedicated Google Sign-In disclosure describing the Google identity data used by Top 7 and explicitly states that Google Sign-In does not grant access to Gmail, Drive, Calendar, Contacts, or other Google account content.
