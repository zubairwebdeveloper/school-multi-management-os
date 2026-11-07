"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900";
export const primaryBtn =
  "rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60";
export const ghostBtn =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800";

export const card = "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";

export function StatusBadge({ status }) {
  const map = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    DRAFT: "bg-amber-100 text-amber-700",
    CLOSED: "bg-slate-200 text-slate-600",
    ARCHIVED: "bg-slate-200 text-slate-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] || map.CLOSED}`}>{status[0] + status.slice(1).toLowerCase()}</span>;
}

/**
 * Generic form. fields: [{name,label,type?,options?,placeholder?,wide?,default?,min?,max?}]
 * onSubmit(values) must return { ok, error?, fieldErrors?, message? } (a Server Action result).
 * Server Actions validate everything again; this component only collects input.
 */
export function ActionForm({ fields, initial = {}, submitLabel, onSubmit, onDone, resetOnSuccess = true, cols = 2, onCancel }) {
  const router = useRouter();
  const start = () => Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? f.default ?? ""]));
  const [values, setValues] = useState(start);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await onSubmit(values);
      if (res.ok) {
        toast.success(res.message || "Saved.");
        if (resetOnSuccess) setValues(start());
        onDone?.(res);
        router.refresh();
      } else {
        setErrors(res.fieldErrors || {});
        toast.error(res.error || "Something went wrong.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className={`grid gap-3 ${cols === 1 ? "" : "sm:grid-cols-2"}`}>
        {fields.map((f) => {
          const id = `f-${f.name}-${f.label.replace(/\W/g, "")}`;
          const common = {
            id, value: values[f.name], className: inputCls,
            onChange: (e) => setValues((v) => ({ ...v, [f.name]: e.target.value })),
          };
          return (
            <div key={f.name} className={f.wide ? "sm:col-span-2" : ""}>
              <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{f.label}</label>
              {f.options ? (
                <select {...common}>
                  <option value="" disabled>Select…</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input {...common} type={f.type || "text"} placeholder={f.placeholder} min={f.min} max={f.max} />
              )}
              {errors[f.name] && <p className="mt-1 text-xs text-red-600">{errors[f.name][0] || errors[f.name]}</p>}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} className={ghostBtn}>Cancel</button>}
      </div>
    </form>
  );
}

/** Button that confirms, runs a Server Action, toasts the result and refreshes. */
export function ConfirmButton({ children, confirm, run, className = ghostBtn }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function onClick() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    try {
      const res = await run();
      if (res.ok) { toast.success(res.message || "Done."); router.refresh(); }
      else toast.error(res.error || "Something went wrong.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return <button type="button" onClick={onClick} disabled={busy} className={className}>{children}</button>;
}
