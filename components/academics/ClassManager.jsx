"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRICULA } from "@/lib/onboarding/constants";
import { ActionForm, ConfirmButton, StatusBadge, card, ghostBtn, inputCls } from "./shared";
import {
  createClass, createSection, setClassStatus, setSectionStatus, updateClass, updateSection,
} from "@/app/(workspace)/[tenantSlug]/dashboard/classes/actions";

const curriculumLabel = Object.fromEntries(CURRICULA.map((c) => [c.value, c.label]));

function SectionRow({ slug, s, canManage, sessionOpen }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <li className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
        <ActionForm
          fields={[{ name: "name", label: "Section" }, { name: "capacity", label: "Capacity", type: "number", min: 1 }]}
          initial={{ name: s.name, capacity: s.capacity }}
          submitLabel="Save"
          resetOnSuccess={false}
          onSubmit={(v) => updateSection(slug, s.id, v)}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
      <span>
        <span className="font-medium">Section {s.name}</span>
        <span className="text-slate-500"> · capacity {s.capacity}</span>{" "}
        {s.status !== "ACTIVE" && <StatusBadge status={s.status} />}
      </span>
      {canManage && (
        <span className="flex gap-2">
          {sessionOpen && s.status === "ACTIVE" && <button className={ghostBtn} onClick={() => setEditing(true)}>Edit</button>}
          {s.status === "ACTIVE" ? (
            <ConfirmButton confirm={`Archive section ${s.name}?`} run={() => setSectionStatus(slug, s.id, "ARCHIVED")}>Archive</ConfirmButton>
          ) : (
            <ConfirmButton run={() => setSectionStatus(slug, s.id, "ACTIVE")}>Restore</ConfirmButton>
          )}
        </span>
      )}
    </li>
  );
}

function ClassCard({ slug, c, sections, canManage, selectedSession }) {
  const [editing, setEditing] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const sessionOpen = selectedSession && selectedSession.status !== "CLOSED";

  return (
    <li className={card}>
      {editing ? (
        <ActionForm
          fields={[
            { name: "name", label: "Class name" },
            { name: "level", label: "Sort order", type: "number", min: 0, max: 30 },
            { name: "curriculum", label: "Curriculum", wide: true, options: CURRICULA },
          ]}
          initial={{ name: c.name, level: c.level, curriculum: c.curriculum }}
          submitLabel="Save"
          resetOnSuccess={false}
          onSubmit={(v) => updateClass(slug, c.id, v)}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">{c.name} {c.status !== "ACTIVE" && <StatusBadge status={c.status} />}</h3>
            <p className="text-xs text-slate-500">{c.campusName} · {curriculumLabel[c.curriculum] || c.curriculum}</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              {c.status === "ACTIVE" && <button className={ghostBtn} onClick={() => setEditing(true)}>Edit</button>}
              {c.status === "ACTIVE" ? (
                <ConfirmButton confirm={`Archive ${c.name}?`} run={() => setClassStatus(slug, c.id, "ARCHIVED")}>Archive</ConfirmButton>
              ) : (
                <ConfirmButton run={() => setClassStatus(slug, c.id, "ACTIVE")}>Restore</ConfirmButton>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Sections {selectedSession ? `· ${selectedSession.name}` : ""}
        </h4>
        {sections.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">{selectedSession ? "No sections in this session." : "Select a session to see sections."}</p>
        ) : (
          <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
            {sections.map((s) => <SectionRow key={s.id} slug={slug} s={s} canManage={canManage} sessionOpen={sessionOpen} />)}
          </ul>
        )}
        {canManage && c.status === "ACTIVE" && sessionOpen && (
          addingSection ? (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <ActionForm
                fields={[{ name: "name", label: "Section", placeholder: "A" }, { name: "capacity", label: "Capacity", type: "number", default: "30", min: 1 }]}
                submitLabel="Add section"
                onSubmit={(v) => createSection(slug, { ...v, classId: c.id, sessionId: selectedSession.id })}
                onDone={() => setAddingSection(false)}
                onCancel={() => setAddingSection(false)}
              />
            </div>
          ) : (
            <button className={`${ghostBtn} mt-3`} onClick={() => setAddingSection(true)}>Add section</button>
          )
        )}
      </div>
    </li>
  );
}

export default function ClassManager({ slug, canManage, campuses, sessions, selectedSessionId, classes, sections }) {
  const router = useRouter();
  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="session-select" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Academic session</label>
          <select id="session-select" className={`${inputCls} min-w-[12rem]`} value={selectedSessionId || ""}
            onChange={(e) => router.push(`/${slug}/dashboard/classes?session=${encodeURIComponent(e.target.value)}`)}>
            {sessions.length === 0 && <option value="">No sessions</option>}
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status.toLowerCase()})</option>)}
          </select>
        </div>
        {selectedSession?.status === "CLOSED" && <p className="text-sm text-slate-500">This session is closed. Sections are read-only.</p>}
      </div>

      {canManage && (
        <section className={card}>
          <h2 className="mb-3 text-base font-semibold">Add class</h2>
          <ActionForm
            fields={[
              { name: "campusId", label: "Campus", options: campuses.map((c) => ({ value: c.id, label: c.name })) },
              { name: "name", label: "Class name", placeholder: "e.g. Grade 5" },
              { name: "level", label: "Sort order", type: "number", default: "1", min: 0, max: 30 },
              { name: "curriculum", label: "Curriculum", options: CURRICULA },
            ]}
            submitLabel="Create class"
            onSubmit={(v) => createClass(slug, v)}
          />
        </section>
      )}

      {classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">
          No classes yet.
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {classes.map((c) => (
            <ClassCard key={c.id} slug={slug} c={c} canManage={canManage} selectedSession={selectedSession}
              sections={sections.filter((s) => s.classId === c.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
