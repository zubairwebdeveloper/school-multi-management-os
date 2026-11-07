export const INSTITUTION_TYPES = [
  { value: "INDEPENDENT_SCHOOL", label: "Independent school" },
  { value: "SCHOOL_NETWORK", label: "School network / education group" },
  { value: "PRIMARY_SECONDARY", label: "Primary & secondary school" },
  { value: "HIGHER_SECONDARY", label: "Higher secondary school" },
  { value: "COLLEGE", label: "College" },
  { value: "ACADEMY", label: "Academy / tuition center" },
  { value: "OTHER", label: "Other institution" },
];

export const CURRICULA = [
  { value: "MATRIC", label: "Pakistan Matriculation" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "O_LEVEL", label: "Cambridge O Level" },
  { value: "A_LEVEL", label: "Cambridge A Level" },
  { value: "CUSTOM", label: "Custom curriculum" },
];

export const APPLICATION_STATUS = Object.freeze({
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
});

// Statuses that block submitting another application
export const ACTIVE_APPLICATION_STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED"];
