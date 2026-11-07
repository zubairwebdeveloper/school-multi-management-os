export function slugify(input) {
  const s = String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "school";
}

const RESERVED = new Set([
  "admin", "api", "app", "platform", "login", "register", "onboarding", "dashboard",
  "pricing", "features", "about", "contact", "blog", "docs", "www", "support",
]);

/** Candidate slugs in order of preference; uniqueness is enforced in the transaction. */
export function slugCandidates(name, applicationId) {
  let base = slugify(name);
  if (RESERVED.has(base)) base = `${base}-school`;
  const a = applicationId.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [base, `${base}-${a.slice(0, 4)}`, `${base}-${a.slice(0, 8)}`];
}
