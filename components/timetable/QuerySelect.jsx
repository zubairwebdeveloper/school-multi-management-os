"use client";
import { useRouter } from "next/navigation";
import { inputCls } from "@/components/academics/shared";

// Navigates with a query param. The server page validates the value again.
export default function QuerySelect({ basePath, name, label, options, value, keep = {} }) {
  const router = useRouter();
  return (
    <div className="print:hidden">
      <label htmlFor={`qs-${name}`} className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
      <select id={`qs-${name}`} className={`${inputCls} min-w-[14rem]`} value={value || ""}
        onChange={(e) => router.push(`${basePath}?${new URLSearchParams({ ...keep, [name]: e.target.value }).toString()}`)}>
        {options.length === 0 && <option value="">None available</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
