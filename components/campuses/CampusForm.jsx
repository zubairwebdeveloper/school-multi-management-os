"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CAMPUS_TYPES, campusSchema } from "@/lib/validations/campus";
import { createCampus, updateCampus } from "@/app/(workspace)/[tenantSlug]/dashboard/campuses/actions";

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900";
const label = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";
const err = "mt-1 text-xs text-red-600";

export default function CampusForm({ slug, campus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const editing = !!campus;

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(campusSchema),
    defaultValues: {
      name: campus?.name || "",
      code: campus?.code || "",
      campusType: campus?.campusType || "MIXED",
      city: campus?.city || "",
      address: campus?.address || "",
      phone: campus?.phone || "",
      email: campus?.email || "",
      notes: campus?.notes || "",
    },
  });

  async function onSubmit(values) {
    setBusy(true);
    try {
      const res = editing ? await updateCampus(slug, campus.id, values) : await createCampus(slug, values);
      if (res.ok) {
        toast.success(editing ? "Campus updated." : "Campus created.");
        router.push(`/${slug}/dashboard/campuses`);
        router.refresh();
        return;
      }
      Object.entries(res.fieldErrors || {}).forEach(([k, v]) => setError(k, { message: v?.[0] }));
      toast.error(res.error || "Something went wrong.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const f = (id, text, props = {}) => (
    <div className={props.wide ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className={label}>{text}</label>
      <input id={id} className={input} {...register(id)} type={props.type || "text"} placeholder={props.placeholder} />
      {errors[id] && <p className={err}>{errors[id].message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {f("name", "Campus name", { wide: true, placeholder: "e.g. City Campus" })}
        {f("code", "Short code (optional)", { placeholder: "e.g. CITY" })}
        <div>
          <label htmlFor="campusType" className={label}>Campus type</label>
          <select id="campusType" className={input} {...register("campusType")}>
            {CAMPUS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {f("city", "City")}
        {f("phone", "Phone", { type: "tel" })}
        {f("address", "Address", { wide: true })}
        {f("email", "Email (optional)", { type: "email", wide: true })}
        <div className="sm:col-span-2">
          <label htmlFor="notes" className={label}>Internal notes (optional)</label>
          <textarea id="notes" rows={3} className={input} {...register("notes")} />
          {errors.notes && <p className={err}>{errors.notes.message}</p>}
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {busy ? "Saving…" : editing ? "Save changes" : "Create campus"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          Cancel
        </button>
      </div>
    </form>
  );
}
