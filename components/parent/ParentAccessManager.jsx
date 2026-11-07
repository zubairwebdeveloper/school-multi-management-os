"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmButton, card, ghostBtn, inputCls, primaryBtn } from "@/components/academics/shared";
import EmailInviteButton from "@/components/communications/EmailInviteButton";
import { inviteGuardian, revokeGuardianInvitation, setParentAccess } from "@/app/(workspace)/[tenantSlug]/dashboard/settings/parent-access/actions";

function GuardianRow({ slug, studentId, g }) {
  const router = useRouter();
  const [email, setEmail] = useState(g.email);
  const [created, setCreated] = useState(null); // { link, path, email }
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function invite(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await inviteGuardian(slug, { studentId, guardianId: g.id, email });
      if (res.ok) { setCreated({ link: `${window.location.origin}${res.path}`, path: res.path, email: email.trim().toLowerCase() }); toast.success(res.message); router.refresh(); }
      else toast.error(res.fieldErrors?.email?.[0] || res.error);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  const badge = { ACTIVE: ["Portal active", "bg-emerald-100 text-emerald-700"], SUSPENDED: ["Suspended", "bg-slate-200 text-slate-600"], INVITED: ["Invited", "bg-amber-100 text-amber-700"], NONE: ["No portal login", "bg-slate-100 text-slate-500"] }[g.portal];

  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span><span className="font-medium">{g.fullName}</span> <span className="text-slate-500">· {g.relationship} · {g.phone}{g.email ? ` · ${g.email}` : ""}</span></span>
        <span className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[1]}`}>{badge[0]}</span>
          {g.portal === "NONE" && <button className={ghostBtn} onClick={() => setOpen((v) => !v)}>Invite</button>}
          {g.portal === "INVITED" && <ConfirmButton confirm="Revoke this invitation?" run={() => revokeGuardianInvitation(slug, g.inviteId)}>Revoke</ConfirmButton>}
          {g.portal === "ACTIVE" && <ConfirmButton confirm="Suspend this parent's portal access?" run={() => setParentAccess(slug, g.id, "INACTIVE")}>Suspend</ConfirmButton>}
          {g.portal === "SUSPENDED" && <ConfirmButton run={() => setParentAccess(slug, g.id, "ACTIVE")}>Restore</ConfirmButton>}
        </span>
      </div>
      {open && g.portal === "NONE" && (
        <form onSubmit={invite} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50" noValidate>
          <div>
            <label htmlFor={`pe-${g.id}`} className="mb-1 block text-xs font-medium">Email the parent will sign in with</label>
            <input id={`pe-${g.id}`} type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </div>
          <button type="submit" disabled={busy || !email} className={primaryBtn}>{busy ? "Creating…" : "Create invitation link"}</button>
          <p className="text-xs text-slate-500">The link is shown once and expires in 7 days. Copy it, or email it to the address above if email is configured on the server.</p>
          {created && (
            <div className="space-y-2">
              <input readOnly value={created.link} onFocus={(e) => e.target.select()} aria-label="Invitation link" className={`${inputCls} font-mono text-xs`} />
              <div className="flex flex-wrap gap-2">
                <button type="button" className={ghostBtn} onClick={() => navigator.clipboard.writeText(created.link).then(() => toast.success("Link copied."), () => toast.error("Copy failed. Select and copy manually."))}>Copy link</button>
                <EmailInviteButton slug={slug} path={created.path} email={created.email} />
              </div>
            </div>
          )}
        </form>
      )}
    </li>
  );
}

export default function ParentAccessManager({ slug, student, guardians }) {
  return (
    <section className={card}>
      <h2 className="text-base font-semibold">{student.name} <span className="font-mono text-xs font-normal text-slate-500">{student.adm}</span></h2>
      <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
        {guardians.map((g) => <GuardianRow key={g.id} slug={slug} studentId={student.id} g={g} />)}
      </ul>
    </section>
  );
}
