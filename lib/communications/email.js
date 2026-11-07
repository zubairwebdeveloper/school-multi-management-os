import "server-only";

// Email goes through ONE adapter. Nothing is "sent" unless a provider is configured, and callers must report the real outcome.
// Supported: Resend (EMAIL_PROVIDER=resend, RESEND_API_KEY, EMAIL_FROM). Add other providers here without touching callers.
export function emailConfig() {
  if (process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return { provider: "resend" };
  return null;
}

export const appUrl = () => (process.env.APP_URL || "").replace(/\/+$/, "");

const clean = (s) => String(s).replace(/[\r\n]+/g, " ").slice(0, 200);

/** Returns { ok: true, id } or { ok: false, error }. Never throws. Plain-text only. */
export async function sendEmail({ to, subject, text }) {
  const cfg = emailConfig();
  if (!cfg) return { ok: false, error: "NOT_CONFIGURED" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to || "")) return { ok: false, error: "Invalid recipient address." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: clean(subject), text: String(text).slice(0, 10000) }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `Provider error (${res.status})` };
    return { ok: true, id: data.id || null };
  } catch {
    return { ok: false, error: "The email provider could not be reached." };
  }
}
