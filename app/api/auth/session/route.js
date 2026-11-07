import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { sessionSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

const COOKIE = "__session";
const MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

// Basic in-memory limiter. NOTE: per-instance only; use a shared store
// (Upstash/Redis) before production.
const hits = new Map();
function limited(key, max = 10, windowMs = 60_000) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again soon." }, { status: 429 });
  }

  let body;
  try {
    body = sessionSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(body.idToken, true);

    // Only mint a session for a recent sign-in (5 minutes).
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
    }

    // Password accounts must verify email first. Google accounts arrive verified.
    if (!decoded.email_verified) {
      return NextResponse.json(
        { error: "Email not verified", code: "EMAIL_NOT_VERIFIED" },
        { status: 403 }
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
      expiresIn: MAX_AGE_MS,
    });

    (await cookies()).set(COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_MS / 1000,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}

export async function DELETE() {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  if (value) {
    try {
      const decoded = await adminAuth.verifySessionCookie(value);
      await adminAuth.revokeRefreshTokens(decoded.uid);
    } catch {
      /* cookie already invalid */
    }
  }
  store.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
