# QA Audit Findings

## CRITICAL BUGS

### BUG-01: CoachOnboarding has leftover console.logs leaking PII
- **File**: `components/onboarding/CoachOnboarding`
- **Lines**: 51, 65-66, 73, 76, 83-84
- **Issue**: `console.log('[CoachOnboarding] create team started', { coachEmail, ... })` logs coach email and team name to browser console in production. Several others log team IDs and internal state.
- **Severity**: High (PII leakage)

### BUG-02: AthleteOnboarding "Go to My Dashboard" — no user_type persisted
- **File**: `components/onboarding/AthleteOnboarding`
- **Issue**: `handleDone` calls `refetchUser()` only. It never calls `base44.auth.updateMe({ user_type: 'athlete' })`. If the user refreshes before localStorage is read, they get routed back to OnboardingWizard because `user.user_type` is empty/null and there's no server-side record. Role depends entirely on `localStorage` for athletes — survives tab close but not a different device/browser.
- **Severity**: Critical — athletes who clear storage or use a new device re-enter onboarding every time.

### BUG-03: CoachOnboarding duplicate team check is insufficient
- **File**: `components/onboarding/CoachOnboarding` line 63–65
- **Issue**: `Team.filter({ coach_email: coachEmail })` may return archived teams. Coach clicks "Skip for now" then comes back and tries "Create Team" — finds the old archived team and silently skips creating a new one, leaving the coach with no active team.
- **Severity**: Medium

### BUG-04: Goals delete has no confirmation dialog
- **File**: `pages/Goals`
- **Line**: 104
- **Issue**: Clicking the `Trash2` icon on a goal calls `deleteMut.mutate(goal.id)` immediately with no confirmation. One misclick destroys user data permanently.
- **Severity**: High (data loss)

### BUG-05: Workouts page — athletes cannot log workouts (intended), but "Log Run" button silently absent with no messaging
- **File**: `pages/Workouts`
- **Line**: 26, 139
- **Issue**: `canCreate = !isAthlete`. Athlete visiting `/workouts` sees a board with no action buttons and no explanatory empty-state message that their coach assigns workouts. This is confusing UX even if intentional.
- **Severity**: Low/UX

### BUG-06: AccountSettings — `handleSave` has no error handling
- **File**: `pages/AccountSettings`
- **Line**: 34–40
- **Issue**: `await base44.auth.updateMe(form)` has no try/catch. On network failure, `saving` stays true and the button spins forever.
- **Severity**: Medium

### BUG-07: CoachPanel — "Invite Athlete" modal dismiss uses `✕` plain text, not accessible button
- **File**: `pages/CoachPanel` line 424
- **Issue**: `<button onClick={() => setShowInvite(false)}>✕</button>` — no aria-label, no keyboard accessible close. Screen readers say "times" or "multiplication sign".
- **Severity**: Medium (Accessibility)

### BUG-08: CoachPanel — No loading state when `myTeams` is fetching (initial load)
- **File**: `pages/CoachPanel`
- **Issue**: The `myTeams` query has no `isLoading` guard at the top level. The page renders "No teams yet" (line 240) during the first 100ms before teams arrive, causing a flash of empty state for all coaches.
- **Severity**: Medium (Flash of wrong content)

### BUG-09: JoinTeam auto-submit race condition
- **File**: `pages/JoinTeam` lines 26–34
- **Issue**: The second `useEffect` depends on `[code, isAuthenticated, user, autoSubmitted]`. If `isAuthenticated` becomes true before `user` is populated (possible in async auth flow), `handleJoin` is called with an authenticated session but before `user.email` is available — the backend function `joinTeam` may record a null email.
- **Severity**: Medium

### BUG-10: MyPlan — "Done" button in full schedule does not disable after first click while pending
- **File**: `pages/MyPlan` line 430
- **Issue**: `disabled={completingId === w.id && completeMut.isPending}` — if the user quickly clicks a second workout's Done button before the first resolves, `completingId` is the first workout's ID, so the second button is NOT disabled. Two completions can fire in parallel, creating duplicate WorkoutCompletion records.
- **Severity**: Medium (duplicate data)

### BUG-11: Dashboard completion circle — no debounce, can fire multiple times
- **File**: `pages/Dashboard` line 124
- **Issue**: `onClick={() => completeMut.mutate({ workout: todayWorkout })}` is disabled only when `todayDone || completeMut.isPending`. But if the user clicks before `isPending` becomes true (sub-16ms window), two mutations fire.
- **Severity**: Low (mitigated by disabled flag, race window is small)

### BUG-12: Mobile — Athlete "Workouts" route is in ALLOWED_ROUTES but not in MOBILE_NAV_TABS
- **File**: `lib/roleConfig.js`
- **Issue**: Athletes can reach `/workouts` by URL but there's no bottom nav tab for it. The weekly board is valuable for athletes but effectively unreachable on mobile unless they know the URL.
- **Severity**: Medium (unreachable page on mobile)

### BUG-13: Coach sidebar missing `/messages` route tab
- **File**: `lib/roleConfig.js` line 114
- **Issue**: `/messages` is in `ALLOWED_ROUTES.coach` but not in `SIDEBAR_MENU.coach` or `MOBILE_NAV_TABS.coach`. Coaches can't navigate to Messages from any navigation element — the page is functionally unreachable unless typed directly.
- **Severity**: High (unreachable page)

### BUG-14: Onboarding wizard — `PREVIEW_EMAILS` hardcoded in RoleContext
- **File**: `lib/RoleContext.jsx` line 25
- **Issue**: `PREVIEW_EMAILS` contains real developer email addresses hardcoded in source. These two specific users get special preview-switch behavior. This is a maintainability concern and a minor security leak if the repo becomes public.
- **Severity**: Low (maintainability)

### BUG-15: Goals progress bar — division-by-zero guard missing for time goals
- **File**: `pages/Goals` line 85
- **Issue**: `(target / current) * 100` — if `current` is `"0:00:00"` (parses to 0 seconds), this produces `Infinity`. `Math.min(100, Infinity)` = 100, so the progress bar always shows 100% for time goals with a current value of zero.
- **Severity**: Low (visual bug)

---

## SECURITY CONCERNS

### SEC-01: Coach invite close button is plain `✕` character
- Already covered in BUG-07

### SEC-02: `ALLOWED_ROUTES` enforced client-side only
- Route gating (`isRouteAllowed`) is purely in the React router. Any user can navigate to `/admin` by typing the URL if they are authenticated. The AdminPanel page itself should verify `user.role === 'admin'` — verify this is done.
- **Status**: Verify in `pages/AdminPanel`

---

## MISSING EMPTY STATES

- `/analytics` — no check needed (has its own loading/empty logic)
- `/shoes` — verify empty state shown when no shoes exist
- `/messages` — verify empty state when no conversations exist
- `/goals` ✅ has proper empty state
- Coach Panel Athletes tab — loading spinner shows, empty state shows if 0 members ✅