export const tenthsText = (n) => (n == null ? "" : n % 10 === 0 ? String(n / 10) : (n / 10).toFixed(1));
