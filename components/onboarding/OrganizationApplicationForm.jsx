"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { applicationSchema } from "@/lib/validations/onboarding";
import { CURRICULA, INSTITUTION_TYPES } from "@/lib/onboarding/constants";

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const label = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";
const err = "mt-1 text-xs text-red-600";

function Section({ title, hint, children }) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <legend className="px-2 text-base font-semibold">{title}</legend>
      {hint && <p className="-mt-2 text-xs text-slate-500">{hint}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export default function OrganizationApplicationForm({ defaultEmail = "" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      organization: { contactEmail: defaultEmail, curricula: [], country: "Pakistan" },
    },
  });

  async function onSubmit(values) {
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || res.status === 409) {
        toast.success(res.ok ? "Application submitted." : "You already have an application.");
        router.replace("/onboarding/pending");
        router.refresh();
        return;
      }
      toast.error(data.error || "Could not submit application.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const o = errors.organization || {};
  const c = errors.campus || {};

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Section title="Organization" hint="Details about your school or education group.">
        <div className="sm:col-span-2">
          <label htmlFor="org-name" className={label}>Organization name</label>
          <input id="org-name" className={input} {...register("organization.name")} />
          {o.name && <p className={err}>{o.name.message}</p>}
        </div>
        <div>
          <label htmlFor="org-type" className={label}>Institution type</label>
          <select id="org-type" className={input} defaultValue="" {...register("organization.institutionType")}>
            <option value="" disabled>Select…</option>
            {INSTITUTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {o.institutionType && <p className={err}>Select an institution type</p>}
        </div>
        <div>
          <label htmlFor="org-students" className={label}>Expected number of students</label>
          <input id="org-students" type="number" min="1" className={input} {...register("organization.expectedStudents")} />
          {o.expectedStudents && <p className={err}>{o.expectedStudents.message}</p>}
        </div>
        <div>
          <label htmlFor="org-email" className={label}>Contact email</label>
          <input id="org-email" type="email" className={input} {...register("organization.contactEmail")} />
          {o.contactEmail && <p className={err}>{o.contactEmail.message}</p>}
        </div>
        <div>
          <label htmlFor="org-phone" className={label}>Contact phone</label>
          <input id="org-phone" type="tel" className={input} {...register("organization.contactPhone")} />
          {o.contactPhone && <p className={err}>{o.contactPhone.message}</p>}
        </div>
        <div>
          <label htmlFor="org-city" className={label}>City</label>
          <input id="org-city" className={input} {...register("organization.city")} />
          {o.city && <p className={err}>{o.city.message}</p>}
        </div>
        <div>
          <label htmlFor="org-country" className={label}>Country</label>
          <input id="org-country" className={input} {...register("organization.country")} />
          {o.country && <p className={err}>{o.country.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="org-address" className={label}>Address</label>
          <input id="org-address" className={input} {...register("organization.address")} />
          {o.address && <p className={err}>{o.address.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="org-web" className={label}>Website (optional)</label>
          <input id="org-web" className={input} placeholder="https://" {...register("organization.website")} />
        </div>
        <div className="sm:col-span-2">
          <span className={label}>Curricula offered</span>
          <div className="flex flex-wrap gap-3">
            {CURRICULA.map((cu) => (
              <label key={cu.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" value={cu.value} {...register("organization.curricula")} />
                {cu.label}
              </label>
            ))}
          </div>
          {o.curricula && <p className={err}>{o.curricula.message}</p>}
        </div>
      </Section>

      <Section title="Initial campus" hint="You can add more campuses after approval.">
        <div className="sm:col-span-2">
          <label htmlFor="campus-name" className={label}>Campus name</label>
          <input id="campus-name" className={input} placeholder="e.g. Main Campus" {...register("campus.name")} />
          {c.name && <p className={err}>{c.name.message}</p>}
        </div>
        <div>
          <label htmlFor="campus-city" className={label}>Campus city</label>
          <input id="campus-city" className={input} {...register("campus.city")} />
          {c.city && <p className={err}>{c.city.message}</p>}
        </div>
        <div>
          <label htmlFor="campus-phone" className={label}>Campus phone</label>
          <input id="campus-phone" type="tel" className={input} {...register("campus.phone")} />
          {c.phone && <p className={err}>{c.phone.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="campus-address" className={label}>Campus address</label>
          <input id="campus-address" className={input} {...register("campus.address")} />
          {c.address && <p className={err}>{c.address.message}</p>}
        </div>
      </Section>

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" {...register("acceptTerms")} />
          <span>I confirm the details are accurate and accept the Terms of Service and Privacy Policy.</span>
        </label>
        {errors.acceptTerms && <p className={err}>{errors.acceptTerms.message}</p>}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {busy ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
