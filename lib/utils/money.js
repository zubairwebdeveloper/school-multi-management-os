// Money is stored as INTEGER MINOR UNITS (paisa) so sums are exact. Never use floats for stored amounts.
export function parseMinor(str) {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(String(str ?? "").trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] || "").padEnd(2, "0"));
}

export function formatMoney(minor, currency = "PKR") {
  const n = (Number(minor) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-PK", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export const toInput = (minor) => ((Number(minor) || 0) / 100).toFixed(2);
