"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { card, ConfirmButton, ghostBtn, inputCls, primaryBtn } from "@/components/academics/shared";
import EmailInviteButton from "@/components/communications/EmailInviteButton";
import { createInvitation, revokeInvitation, setMemberStatus, updateMember } from "@/app/(workspace)/[tenantSlug]/dashboard/settings/team/actions";

const lbl = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300";

function CampusChecks({ campuses, value, onChange, idPrefix }) {
  return (
    <fieldset>
      <legend className={lbl}>Campuses</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {campuses.map((c) => (
          <label key={c.id} htmlFor={`${idPrefix}-${c.id}`} className="flex items-center gap-2 text-sm">
            <input id={`${idPrefix}-${c.id}`} type="checkbox" checked={value.includes(c.id)}
              onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((x) => x !== c.id))} />
            {c.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function InviteForm({ slug, roles, campuses, employees }) {
  const router = useRouter();
  const [v, setV] = useState({ email: "", role: "", campusIds: [], employeeId: "" });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null); // { link, path, email }
  const [errors, setErrors] = useState({});
  const kind = roles.find((r) => r.value === v.role)?.kind;
  const eligible = useMemo(() => employees.filter((e) => (kind === "ASSIGNED" ? e.staffType === "TEACHING" : true) && (kind === "ORG" ? true : v.campusIds.includes(e.campusId))), [employees, kind, v.campusIds]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErrors({}); setCreated(null);
    try {
      const res = await createInvitation(slug, v);
      if (res.ok) {
        setCreated({ link: `${window.location.origin}${res.path}`, path: res.path, email: v.email.trim().toLowerCase() });
        toast.success(res.message);
        setV({ email: "", role: "", campusIds: [], employeeId: "" });
        router.refresh();
      } else { setErrors(res.fieldErrors || {}); toast.error(res.error); }
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <section className={card}>
      <h2 className="mb-1 text-base font-semibold">Invite someone</h2>
      <p className="mb-3 text-xs text-slate-500">The link is shown once and expires in 7 days. You can copy it, or email it to the invited address if email is configured on the server.</p>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="iv-email" className={lbl}>Email</label>
            <input id="iv-email" type="email" className={inputCls} value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} autoComplete="off" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>}
          </div>
          <div>
            <label htmlFor="iv-role" className={lbl}>Role</label>
            <select id="iv-role" className={inputCls} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value, campusIds: [], employeeId: "" })}>
              <option value="" disabled>Select…</option>
              {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role[0]}</p>}
          </div>
        </div>
        {kind && kind !== "ORG" && <CampusChecks idPrefix="iv-c" campuses={campuses} value={v.campusIds} onChange={(campusIds) => setV({ ...v, campusIds, employeeId: "" })} />}
        {kind && (
          <div>
            <label htmlFor="iv-emp" className={lbl}>{kind === "ASSIGNED" ? "Teaching staff record (required)" : "Link to a staff record (optional)"}</label>
            <select id="iv-emp" className={inputCls} value={v.employeeId} onChange={(e) => setV({ ...v, employeeId: e.target.value })}>
              <option value="">{kind === "ASSIGNED" ? "Select…" : "None"}</option>
              {eligible.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.staffId})</option>)}
            </select>
            {kind === "ASSIGNED" && <p className="mt-1 text-xs text-slate-500">Only staff without a login are listed. Choose the campuses first.</p>}
          </div>
        )}
        <button type="submit" disabled={busy || !v.email || !v.role} className={primaryBtn}>{busy ? "Creating…" : "Create invitation link"}</button>
      </form>
      {created && (
        <div className="mt-4 space-y-2 rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-950">
          <p className="font-medium text-emerald-800 dark:text-emerald-300">Invitation link (shown once)</p>
          <input readOnly value={created.link} onFocus={(e) => e.target.select()} aria-label="Invitation link" className={`${inputCls} font-mono text-xs`} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ghostBtn} onClick={() => navigator.clipboard.writeText(created.link).then(() => toast.success("Link copied."), () => toast.error("Copy failed. Select and copy manually."))}>Copy link</button>
            <EmailInviteButton slug={slug} path={created.path} email={created.email} />
          </div>
        </div>
      )}
    </section>
  );
}

function MemberRow({ slug, m, roles, campuses }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(m.role);
  const [ids, setIds] = useState(m.campusIds);
  const [busy, setBusy] = useState(false);
  const kind = roles.find((r) => r.value === role)?.kind;

  async function save() {
    setBusy(true);
    try {
      const res = await updateMember(slug, m.uid, { role, campusIds: kind === "ORG" ? [] : ids });
      if (res.ok) { toast.success(res.message); setEditing(false); router.refresh(); } else toast.error(res.error);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="font-medium">{m.email}</span>{m.isSelf && <span className="ml-1 text-xs text-slate-500">(you)</span>}<br />
          <span className="text-slate-500">{m.roleLabel} · {m.campusNames.join(", ") || "All campuses"}{m.staff ? ` · ${m.staff}` : ""}</span>{" "}
          {m.status !== "ACTIVE" && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">Suspended</span>}
        </span>
        {m.canManage && (
          <span className="flex gap-2">
            <button className={ghostBtn} onClick={() => setEditing((v) => !v)}>Edit access</button>
            {m.status === "ACTIVE"
              ? <ConfirmButton confirm={`Suspend access for ${m.email}? They are signed out of this workspace immediately.`} run={() => setMemberStatus(slug, m.uid, "INACTIVE")}>Suspend</ConfirmButton>
              : <ConfirmButton run={() => setMemberStatus(slug, m.uid, "ACTIVE")}>Restore</ConfirmButton>}
          </span>
        )}
      </div>
      {editing && (
        <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <div>
            <label htmlFor={`mr-${m.uid}`} className={lbl}>Role</label>
            <select id={`mr-${m.uid}`} className={inputCls} value={role} onChange={(e) => { setRole(e.target.value); setIds([]); }}>
              {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {kind && kind !== "ORG" && <CampusChecks idPrefix={`mc-${m.uid}`} campuses={campuses} value={ids} onChange={setIds} />}
          <div className="flex gap-2">
            <button className={primaryBtn} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
            <button className={ghostBtn} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function TeamManager({ slug, roles, campuses, employees, members, invitations }) {
  return (
    <div className="space-y-6">
      <InviteForm slug={slug} roles={roles} campuses={campuses} employees={employees} />

      <section className={card}>
        <h2 className="mb-1 text-base font-semibold">Members ({members.length})</h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {members.map((m) => <MemberRow key={m.uid} slug={slug} m={m} roles={roles} campuses={campuses} />)}
        </ul>
      </section>

      <section className={card}>
        <h2 className="mb-1 text-base font-semibold">Pending invitations ({invitations.length})</h2>
        {invitations.length === 0 ? <p className="text-sm text-slate-500">None.</p> : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {invitations.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><span className="font-medium">{i.email}</span><br /><span className="text-slate-500">{i.roleLabel} · expires {i.expires}</span></span>
                {i.canRevoke && <ConfirmButton confirm={`Revoke the invitation for ${i.email}?`} run={() => revokeInvitation(slug, i.id)}>Revoke</ConfirmButton>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
