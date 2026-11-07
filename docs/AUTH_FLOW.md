# Auth flow (Batch 2)

Register -> Firebase user + verification email -> /verify-email
Login -> Firebase sign-in -> idToken -> POST /api/auth/session
  server: verifyIdToken(checkRevoked) + recent auth_time + email_verified
  -> httpOnly `__session` cookie (5 days, SameSite=Lax, Secure in prod)
Logout -> DELETE /api/auth/session (revokes refresh tokens) + client signOut

Security notes
- No role or tenant is assigned at registration; OWNER is granted server-side after approval.
- Redirect target is validated (safeRedirect) to prevent open redirects.
- Forgot-password never reveals whether an email exists.
- Rate limiter is in-memory (per instance). Replace with Redis/Upstash before production.

Install: npm i firebase react-hook-form zod @hookform/resolvers sonner
Env (client): NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
              NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID
Also: render <Toaster /> from sonner once in the root layout.
Firebase Console: enable Email/Password and Google providers; add your domain to Authorized domains.

Not yet: MFA, passkeys, invitation acceptance, session/device management, middleware route guard.
