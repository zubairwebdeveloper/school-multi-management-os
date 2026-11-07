// Prevent open redirects: only allow same-origin relative paths.
export function safeRedirect(next, fallback = "/onboarding") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
