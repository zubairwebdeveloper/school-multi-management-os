// Pure result computation (no I/O) so it can be unit-tested. All marks are integer TENTHS.
// percent = obtained / total x 100 rounded to 2 decimals, computed with integers only.
export const pct2 = (obtained10, totalMarks) => (totalMarks > 0 ? Math.round((obtained10 * 1000) / totalMarks) / 100 : 0);

/** bands: [{grade,min}] listed from highest to lowest min. */
export function gradeFor(percent, bands) {
  for (const b of bands) if (percent >= b.min) return b.grade;
  return bands.at(-1)?.grade ?? "";
}

/** Competition ranking: 1,2,2,4. */
function rank(items, key) {
  const sorted = [...items].sort((a, b) => key(b) - key(a));
  const out = new Map();
  sorted.forEach((it, i) => out.set(it, i > 0 && key(it) === key(sorted[i - 1]) ? out.get(sorted[i - 1]) : i + 1));
  return out;
}

/**
 * exam: { subjects:[{subjectId,name,total}], bands, passPercent }
 * students: [{ id, sectionId }]
 * marks: Map("<studentId>_<subjectId>" -> { obtained10, absent })
 * Returns { missing } when any student/subject has no mark, otherwise { results, totalMax }.
 * A student PASSES only if every subject is passed (percent >= passPercent and not absent).
 */
export function computeResults({ exam, students, marks }) {
  let missing = 0;
  const totalMax = exam.subjects.reduce((s, x) => s + x.total, 0);
  const rows = students.map((st) => {
    let total10 = 0, failed = 0;
    const subjects = exam.subjects.map((sub) => {
      const m = marks.get(`${st.id}_${sub.subjectId}`);
      if (!m) { missing += 1; return null; }
      const obtained10 = m.absent ? 0 : m.obtained10 ?? 0;
      const percent = pct2(obtained10, sub.total);
      const passed = !m.absent && percent >= exam.passPercent;
      if (!passed) failed += 1;
      total10 += obtained10;
      return { subjectId: sub.subjectId, name: sub.name, total: sub.total, obtained10, absent: !!m.absent, percent, grade: m.absent ? "Abs" : gradeFor(percent, exam.bands), passed };
    });
    return { st, subjects, total10, failed };
  });
  if (missing) return { missing };

  const byClass = rank(rows, (r) => r.total10);
  const bySection = new Map();
  for (const sid of new Set(rows.map((r) => r.st.sectionId))) {
    const group = rows.filter((r) => r.st.sectionId === sid);
    const rk = rank(group, (r) => r.total10);
    group.forEach((r) => bySection.set(r, rk.get(r)));
  }
  const results = rows.map((r) => {
    const percent = pct2(r.total10, totalMax);
    return {
      studentId: r.st.id, sectionId: r.st.sectionId, subjects: r.subjects,
      totalObtained10: r.total10, totalMax, percent, grade: gradeFor(percent, exam.bands),
      failedSubjects: r.failed, result: r.failed === 0 ? "PASS" : "FAIL",
      classPosition: byClass.get(r), sectionPosition: bySection.get(r), classSize: rows.length,
    };
  });
  return { results, totalMax };
}
