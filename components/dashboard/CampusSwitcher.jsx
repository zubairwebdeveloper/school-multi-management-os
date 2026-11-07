"use client";
import { useRouter } from "next/navigation";

// The cookie is only a UI preference. The server re-validates it on every request.
export default function CampusSwitcher({ slug, campuses, selected, allowAll }) {
  const router = useRouter();

  function onChange(e) {
    document.cookie = `campus-${slug}=${encodeURIComponent(e.target.value)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  if (campuses.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="campus-switcher" className="sr-only">Campus</label>
      <select id="campus-switcher" value={selected} onChange={onChange}
        className="max-w-[12rem] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900">
        {allowAll && <option value="ALL">All campuses</option>}
        {campuses.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
