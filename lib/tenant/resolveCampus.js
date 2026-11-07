import "server-only";

/** Picks one campus for screens that are inherently per-campus. Always one of the user's accessible campuses. */
export function resolveCampus(ctx, requested) {
  const ids = ctx.campuses.map((c) => c.id);
  if (ctx.selectedCampusId !== "ALL" && ids.includes(ctx.selectedCampusId)) return ctx.selectedCampusId;
  if (requested && ids.includes(requested)) return requested;
  return ids[0] || null;
}
