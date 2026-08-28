import { NextRequest, NextResponse } from "next/server";

/**
 * PRODUCTION FIX (see docs/ARCHITECTURE.md → "Cross-origin cookie
 * constraint" and DEPLOYMENT.md): this middleware previously redirected to
 * /login whenever `request.cookies.has("refreshToken")` was false.
 *
 * That check does not degrade gracefully cross-origin — it fails *hard*.
 * When frontend (Vercel) and backend (Render/Railway) are on different
 * domains, the refreshToken cookie is scoped to the backend's domain and
 * path (`/api/auth`). The Next.js server here never receives it, for any
 * user, logged in or not. So the old check redirected every single visitor
 * to /login on every direct navigation/reload of a protected route — including
 * users with a perfectly valid session — before client-side JS ever got a
 * chance to run. That's not a caveat, it's a full production outage of the
 * dashboard for real users, which is why it's disabled below rather than
 * left in as a "best-effort" check.
 *
 * The actual redirect-when-logged-out behavior is handled client-side in
 * `(dashboard)/layout.tsx`, which calls `/api/auth/refresh` (a real
 * cross-origin fetch, which works fine — it's a subresource request to the
 * backend's own domain, not the frontend's) and redirects if that fails.
 * The trade-off is a brief loading state before that redirect, instead of
 * an instant server-side one. That's the correct trade-off for a
 * cross-origin deployment; it is NOT a security gap, because the backend
 * independently re-validates the access token on every protected API call
 * regardless of what either the middleware or the client-side guard does.
 *
 * If you later move to a same-site deployment (Next.js `rewrites()`
 * proxying `/api/*` to the backend, both served from one domain), the
 * cookie will reach this middleware again and this check can be
 * reinstated for the faster server-side redirect.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
