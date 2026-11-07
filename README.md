# School Multi Management OS

A modern, multi-tenant School Management SaaS designed to help schools,
academies, colleges, and education groups manage their academic and
administrative operations from one connected platform.

The system brings admissions, students, parents, staff, classes,
attendance, timetables, exams, results, fees, communication, learning
resources, and reporting into a secure, role-based workspace.

> **Project status:** Product specification and development blueprint.
> This README describes the target product, design direction,
> architecture, and planned modules. Features marked as planned must not
> be presented as production-ready until implemented, tested, and
> enabled.

------------------------------------------------------------------------

## Table of Contents

1.  [Product Overview](#product-overview)
2.  [Vision and Product Goals](#vision-and-product-goals)
3.  [Design Direction and Visual
    System](#design-direction-and-visual-system)
4.  [Technology Stack](#technology-stack)
5.  [System Architecture](#system-architecture)
6.  [Applications and Modules](#applications-and-modules)
7.  [Roles and Permissions](#roles-and-permissions)
8.  [Core School Workflows](#core-school-workflows)
9.  [Data Architecture](#data-architecture)
10. [UI and UX Standards](#ui-and-ux-standards)
11. [Security and Student Data
    Privacy](#security-and-student-data-privacy)
12. [Offline and Connectivity
    Strategy](#offline-and-connectivity-strategy)
13. [Project Structure](#project-structure)
14. [Getting Started](#getting-started)
15. [Environment Variables](#environment-variables)
16. [Development Commands](#development-commands)
17. [Testing and Quality](#testing-and-quality)
18. [Deployment](#deployment)
19. [Development Roadmap](#development-roadmap)
20. [Engineering Principles](#engineering-principles)

------------------------------------------------------------------------

## Product Overview

School Multi Management OS is intended for educational institutions that
need a reliable way to manage their day-to-day academic and
administrative work.

It supports the operational needs of:

-   Schools and school groups.
-   Private academies and tuition centers.
-   Colleges and training institutions.
-   Multi-campus education organizations.

The product is organized around four connected experiences:

1.  **Institution website:** public information, admissions,
    announcements, events, and contact details.
2.  **Management workspace:** school leadership and administrative teams
    manage students, staff, academics, fees, and operations.
3.  **Teaching and learning workspace:** teachers manage classes,
    attendance, assignments, exams, marks, and learning resources.
4.  **Parent and student portals:** families and learners view relevant
    attendance, timetable, homework, results, fee information, and
    notices.

The long-term goal is a configurable SaaS platform where multiple
institutions can operate independently with their own branding,
campuses, academic structures, users, and data.

## Vision and Product Goals

### Vision

Make school administration simpler, academic information easier to
access, and communication between institutions, teachers, parents, and
students more organized.

### Goals

-   Replace disconnected spreadsheets and manual registers with one
    consistent system.
-   Reduce repetitive administrative work.
-   Make student, parent, teacher, and class information easy to find.
-   Improve attendance and fee follow-up workflows.
-   Give teachers practical tools for daily classroom work.
-   Make academic progress visible through understandable reports.
-   Support multiple campuses under one institution.
-   Enforce strict data isolation between SaaS tenants.
-   Provide responsive experiences on desktops, tablets, and mobile
    devices.
-   Support low-connectivity environments through carefully designed
    offline workflows where feasible.

------------------------------------------------------------------------

## Design Direction and Visual System

### Overall visual identity

The product should feel like a premium, modern education SaaS platform:
welcoming, organized, trustworthy, and easy to use for both technical
and non-technical staff.

Avoid the look of an outdated school ERP with crowded screens, tiny
text, excessive colors, and complicated navigation.

**Design principles**

-   Clean layouts with a strong visual hierarchy.
-   Calm neutral surfaces with a restrained brand accent.
-   Friendly but professional visual language.
-   Clear typography and generous spacing.
-   Consistent cards, tables, dialogs, forms, and navigation.
-   Use status colors only to communicate meaningful states.
-   Subtle motion for transitions and feedback, never for decoration
    that slows work.
-   Responsive design for desktop, tablet, and mobile.
-   Accessible contrast, keyboard navigation, visible focus states, and
    readable labels.
-   Different workspaces may have different density: dashboards should
    breathe, while attendance and marksheets should remain efficient.

### Suggested color palette

Use CSS variables and semantic tokens so each institution can customize
its branding.

  Token                Suggested value   Usage
  -------------------- ----------------- --------------------------------------
  Primary              `#4F46E5`         Main actions and selected navigation
  Primary foreground   `#FFFFFF`         Text on primary surfaces
  Secondary accent     `#0F766E`         Supporting highlights
  App background       `#F8FAFC`         Main light workspace
  Surface              `#FFFFFF`         Cards, dialogs, panels
  Main text            `#0F172A`         Headings and body text
  Muted text           `#64748B`         Secondary labels
  Border               `#E2E8F0`         Dividers and input outlines
  Success              `#16A34A`         Present, paid, approved
  Warning              `#D97706`         Pending, late, attention
  Destructive          `#DC2626`         Absent, overdue, rejected
  Info                 `#2563EB`         Informational states

These are starting tokens, not hardcoded requirements. Support light and
dark themes with separately tuned semantic variables. Allow tenant
branding without permitting unreadable color combinations.

### Typography

-   Use a clean UI font such as **DM Sans** or **Inter**.
-   Use consistent heading, body, label, and helper-text scales.
-   Use tabular numerals for fees, marks, attendance percentages, and
    report values.
-   Use readable line heights for long notices and learning content.
-   Keep table headings and form labels clear and consistent.

### Layout patterns

**Management dashboard** - Collapsible sidebar. - Top header with campus
selector, global search, notifications, and account menu. - Breadcrumbs
and page actions. - Summary cards, charts, and recent activity. -
Role-aware dashboard widgets.

**Teacher workspace** - Today's timetable. - Assigned classes and
subjects. - Quick attendance action. - Homework and assignment
overview. - Upcoming exams and marking tasks.

**Attendance workspace** - Class and date selection. - Student list with
clear present/absent/late/leave controls. - Bulk actions with
confirmation. - Save status and submission summary. - Responsive table
or card layout.

**Student profile** - Student identity and admission details. - Guardian
contacts. - Class/section and academic history. - Attendance summary. -
Fee ledger. - Results and documents. - Timeline of important activity,
permission-controlled.

**Parent/student portal** - Simple navigation. - Clear overview of
notices, timetable, attendance, homework, results, and fees. -
Mobile-first layouts and readable content.

**Public school website** - Institution branding and hero section. -
Admissions call to action. - About, academics, facilities, news, events,
gallery, and contact. - Clear campus location and office hours.

### Motion and interaction

-   Use Framer Motion for restrained transitions, drawers, and
    micro-interactions.
-   Use skeleton loaders for data-heavy screens.
-   Provide immediate, clear feedback after saving attendance or marks.
-   Confirm destructive and financially sensitive actions.
-   Respect `prefers-reduced-motion`.
-   Never use animation as the only indicator of loading or status.

------------------------------------------------------------------------

## Technology Stack

The application follows a JavaScript-first Next.js architecture.

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Framework               Next.js App Router      Routing, layouts,
                                                  server rendering, route
                                                  handlers

  Language                JavaScript / JSX        Application code; no
                                                  TypeScript requirement

  UI                      React                   Component-based
                                                  interfaces

  Styling                 Tailwind CSS            Responsive styling and
                                                  design tokens

  Components              shadcn/ui + Radix UI    Accessible reusable
                                                  primitives

  Icons                   Lucide React            Consistent interface
                                                  icons

  Motion                  Framer Motion           Subtle transitions and
                                                  interactions

  Forms                   React Hook Form + Zod   Form state and
                                                  validation

  Data tables             TanStack Table /        Student, staff,
                          Virtual                 attendance, and fee
                                                  tables

  Charts                  Recharts                Academic and
                                                  administrative
                                                  analytics

  Client state            Zustand                 Local UI and workflow
                                                  state

  Authentication          Firebase Authentication User identity and
                                                  sign-in

  Database                Cloud Firestore         Institution, academic,
                                                  and administrative data

  File storage            Firebase Storage        Student documents and
                                                  learning resources

  Trusted server          Firebase Admin SDK      Privileged server-side
  operations                                      access

  Offline storage         IndexedDB + Dexie       Local cache and queued
                                                  operations

  Unit tests              Vitest                  Business logic and
                                                  component tests

  E2E tests               Playwright              End-to-end school
                                                  workflows

  Monitoring              Sentry (planned)        Production error
                                                  monitoring

  Hosting                 Vercel                  Next.js deployment
  -----------------------------------------------------------------------

Keep Firebase Admin SDK code server-only. Never expose service account
credentials or privileged configuration to browser code.

------------------------------------------------------------------------

## System Architecture

Organize the application into clear layers:

1.  **Presentation layer:** public website, admin dashboard, teacher
    workspace, parent portal, student portal.
2.  **Feature layer:** admissions, students, staff, academics,
    attendance, exams, fees, communication, and reports.
3.  **Application/service layer:** permissions, validation, academic
    rules, fee calculations, and workflow orchestration.
4.  **Data access layer:** Firestore repositories and Storage services.
5.  **Infrastructure layer:** Firebase Authentication, Firestore Rules,
    App Check, Admin SDK, monitoring, and deployment.

### Multi-tenant architecture

A tenant represents one educational institution or education group. A
tenant may contain multiple campuses.

``` text
Platform
└── Tenant (School / Education Group)
    ├── Campus A
    │   ├── Academic years and terms
    │   ├── Classes and sections
    │   ├── Students and guardians
    │   ├── Teachers and staff
    │   ├── Attendance
    │   ├── Exams and results
    │   └── Fee records
    └── Campus B
        ├── Classes and sections
        ├── Students and guardians
        ├── Teachers and staff
        ├── Attendance
        ├── Exams and results
        └── Fee records
```

Every tenant-owned record must include a tenant identifier.
Campus-specific records should also include a campus identifier.
Protected operations must verify tenant membership, campus scope, and
permission.

### Architectural rules

-   Public pages must not expose private student or staff records.
-   Client components should call feature services rather than scatter
    Firestore queries throughout the UI.
-   Server routes must validate identity, tenant membership, campus
    access, permissions, and input.
-   Academic year and class context must be explicit in academic
    records.
-   Fee and payment records must be traceable.
-   Sensitive student data must be protected by least-privilege access.
-   Retryable operations should be idempotent.

------------------------------------------------------------------------

## Applications and Modules

## 1. Public Institution Website

A branded public website for each school or education group.

**Suggested pages and content**

-   Home page with institution introduction, hero image, admissions CTA,
    key statistics, and announcements.
-   About page with history, mission, vision, leadership, and values.
-   Academics page with grade levels, programs, curriculum, and subject
    information.
-   Admissions page with eligibility, process, required documents,
    dates, and application form.
-   Facilities page with library, labs, sports, transport, and other
    verified facilities.
-   Faculty/team page with approved staff profiles.
-   News and events page.
-   Gallery page.
-   Contact page with campus addresses, phone, email, office hours, and
    map.
-   Policies page for relevant public policies.
-   Privacy policy and terms.

**Content guidelines**

-   Use authentic institution photography with permission.
-   Keep admission requirements and dates current.
-   Do not publish student photos, names, or results without appropriate
    consent and authorization.
-   Make phone, directions, and admissions actions easy to find.
-   Optimize page metadata, images, and loading performance for SEO.

## 2. Admin Dashboard

The central workspace for authorized school administrators.

**Dashboard overview**

-   Total active students.
-   Total teachers and staff.
-   Student attendance today.
-   Class/section overview.
-   Fee collection summary.
-   Outstanding fee summary.
-   Upcoming exams and events.
-   New admission applications.
-   Recent notices and activity.
-   Campus comparison for multi-campus institutions.

**Management modules**

-   Institution profile and branding.
-   Campus management.
-   Academic years, terms, and holidays.
-   Classes, sections, and subjects.
-   Student admissions and records.
-   Guardian records.
-   Staff and teacher records.
-   Timetables.
-   Attendance.
-   Exams, grading, and results.
-   Fees, invoices, and payments.
-   Notices, events, and messaging.
-   Library and transport (planned).
-   Reports and exports.
-   Roles, permissions, and audit logs.
-   Subscription and billing settings (SaaS phase).

## 3. Admissions and Enrollment

**Features**

-   Online admission inquiry/application.
-   Configurable admission form fields.
-   Applicant and guardian information.
-   Previous school and academic history.
-   Document uploads.
-   Application status tracking.
-   Review notes and approval workflow.
-   Admission number generation.
-   Class and section allocation.
-   Enrollment confirmation.
-   Admission history and reporting.

**Suggested application statuses**

`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`,
`WAITLISTED`, `ENROLLED`.

Admission numbers must be generated safely within the correct tenant and
academic context. Do not use a browser-generated counter for unique
official identifiers.

## 4. Student Information System (SIS)

**Student profile**

-   Admission number and student code.
-   Full name and profile photo where authorized.
-   Date of birth and relevant demographic fields required by the
    institution.
-   Contact details where appropriate.
-   Guardian/parent relationships.
-   Campus, academic year, class, and section.
-   Enrollment status.
-   Previous academic records.
-   Medical/emergency information only where necessary and
    access-restricted.
-   Uploaded documents.
-   Attendance history.
-   Fee ledger.
-   Exam results and report cards.
-   Activity timeline.

**Student management features**

-   Add, edit, transfer, promote, and archive student records.
-   Assign class and section.
-   Manage academic-year enrollment.
-   Track withdrawals and leaving certificates.
-   Search by admission number or authorized student details.
-   Import student records with validation and error reporting.
-   Export permitted records.

Keep sensitive information out of general lists and restrict it to staff
with a legitimate need.

## 5. Parent and Guardian Management

-   Guardian profiles and contact details.
-   Link one or more guardians to a student.
-   Support siblings under one guardian account.
-   Define relationship and primary contact.
-   Parent portal access and invitation.
-   Communication preferences and consent.
-   Emergency contact details where required.
-   Guardian access to permitted student information.

A guardian should only access students explicitly linked and authorized
to their account. Never infer family access from matching names or phone
numbers alone.

## 6. Teacher and Staff Management

**Staff records**

-   Employee ID.
-   Name and contact information.
-   Designation and department.
-   Campus assignment.
-   Subjects and classes assigned.
-   Joining date and employment status.
-   Documents and qualifications where required.
-   Emergency contact details where appropriate.
-   Attendance and leave records.

**Teacher workspace**

-   Assigned classes and subjects.
-   Today's timetable.
-   Attendance marking.
-   Homework and assignments.
-   Exam schedules and marks entry.
-   Student performance overview for assigned classes.
-   Notices and staff communication.

**Staff administration**

-   Staff onboarding and invitations.
-   Role and campus assignment.
-   Teacher workload and subject allocation.
-   Staff attendance.
-   Leave requests and approvals (planned).
-   Staff activity and access history.

## 7. Academic Structure Management

Configure the institution's academic organization.

-   Academic years.
-   Terms, semesters, or sessions.
-   Campuses.
-   Grade levels/classes.
-   Sections and groups.
-   Subjects.
-   Subject-to-class assignments.
-   Teacher assignments.
-   Class capacity.
-   School days and holidays.
-   Promotion and graduation rules.

Academic structures should be configurable because institutions use
different naming conventions and calendars.

## 8. Attendance Management

**Student attendance**

-   Daily class attendance.
-   Present, absent, late, and excused/leave statuses.
-   Bulk marking.
-   Attendance correction with permission and reason.
-   Attendance history by student, class, section, and date.
-   Monthly attendance summaries.
-   Configurable attendance calendar.
-   Parent notification when an approved workflow is configured.

**Staff attendance (planned)**

-   Daily staff attendance.
-   Late arrival and early departure.
-   Leave and absence records.
-   Monthly summaries.

**Attendance safeguards**

-   Prevent duplicate attendance records for the same student,
    class/session, and date unless the model explicitly supports
    multiple sessions.
-   Record who marked or edited attendance.
-   Preserve edit history.
-   Apply institution timezone and academic calendar rules.
-   Make unsubmitted and submitted states obvious.

## 9. Timetable and Scheduling

-   Create weekly class timetables.
-   Assign subjects, teachers, rooms, and time slots.
-   Manage breaks and school periods.
-   Detect teacher and room conflicts.
-   View timetable by class, teacher, and campus.
-   Publish timetable changes.
-   Student and parent timetable views.
-   Teacher daily schedule.

Conflict checks should happen in trusted application logic, not only in
the visual timetable editor.

## 10. Exams, Assessments, and Results

**Exam management**

-   Create exam terms and assessment types.
-   Set exam dates and subjects.
-   Configure maximum marks and passing criteria.
-   Assign classes and sections.
-   Publish exam schedules.
-   Track exam completion.

**Marks management**

-   Enter marks by subject and student.
-   Validate marks against maximum values.
-   Support absent, exempt, and other configured outcomes.
-   Allow authorized review and correction.
-   Track who entered or changed marks.
-   Lock results after approval where required.

**Result generation**

-   Subject-wise marks.
-   Total and percentage.
-   Grade and remarks using configurable grading rules.
-   Position/ranking only if the institution chooses to use it.
-   Student report card.
-   Class performance summary.
-   Printable/downloadable report card.

Grading rules must be configurable by academic year or assessment
scheme. Do not hardcode one grading scale for every institution.

## 11. Fees and Finance Management

**Fee configuration**

-   Fee categories.
-   Tuition and admission fees.
-   Transport, examination, and other configurable charges.
-   Class-wise or student-specific fee structures.
-   Installment schedules.
-   Discounts, scholarships, and concessions.
-   Late fee rules where legally and institutionally appropriate.
-   Due dates and billing periods.

**Fee operations**

-   Generate invoices or fee vouchers.
-   Record cash, bank transfer, card, or configured payment methods.
-   Partial payments.
-   Outstanding balance.
-   Payment receipts.
-   Refund and adjustment workflows.
-   Fee defaulter lists for authorized staff.
-   Student fee ledger.
-   Daily and monthly collection summaries.

**Financial safeguards**

-   Use integer minor currency units or a clearly defined decimal
    strategy.
-   Recalculate totals in trusted code.
-   Never trust browser-submitted payment status.
-   Keep immutable payment transaction references and audit history.
-   Restrict discounts, refunds, and fee adjustments.
-   Do not store raw payment card numbers or CVV.

## 12. Parent Portal

A simple, mobile-first experience for parents and guardians.

**Features**

-   Linked student profiles.
-   Attendance summary.
-   Timetable.
-   Homework and assignments.
-   Exam schedule.
-   Results and report cards.
-   Fee invoices and payment history.
-   School notices and announcements.
-   Events and holidays.
-   Teacher communication where enabled.
-   Profile and notification preferences.

Parents should see only information for students linked to their
verified account.

## 13. Student Portal

A focused learning and academic information workspace.

**Features**

-   Personal academic profile.
-   Class and subject timetable.
-   Attendance summary.
-   Homework and assignments.
-   Learning resources.
-   Exam schedule.
-   Results and report cards.
-   Notices and events.
-   Fee status only if institution policy permits student visibility.

The portal should use age-appropriate design and privacy controls. Avoid
exposing student contact or sensitive administrative information.

## 14. Homework and Learning Resources

-   Teachers create homework and assignments.
-   Set class, section, subject, title, instructions, and due date.
-   Attach files or learning resources.
-   Students view assigned work.
-   Submission upload where enabled.
-   Teacher feedback and grading (planned).
-   Submission status and late indicators.
-   Resource library organized by subject and class.

Uploaded files must be validated, access-controlled, and subject to
storage limits.

## 15. Notices, Events, and Communication

-   School-wide announcements.
-   Campus-specific notices.
-   Class and section notices.
-   Parent/guardian communication.
-   Teacher and staff announcements.
-   Event calendar.
-   Holiday notices.
-   Message delivery status where supported.
-   Email, SMS, or WhatsApp notifications through approved providers.
-   Notification preferences and consent.

Avoid sending sensitive student details through insecure or unapproved
channels. Keep message templates configurable and delivery logs
available to authorized staff.

## 16. Library Management (Planned)

-   Book catalog.
-   ISBN and accession number.
-   Categories and authors.
-   Copies and availability.
-   Student/staff issue and return.
-   Due dates and overdue tracking.
-   Fine rules where applicable.
-   Borrowing history.
-   Library reports.

## 17. Transport Management (Planned)

-   Routes and stops.
-   Vehicles and capacity.
-   Driver and attendant records.
-   Student route assignments.
-   Transport fee configuration.
-   Route attendance or pickup records where implemented.
-   Vehicle documents and maintenance reminders.
-   Parent-facing route information with appropriate privacy controls.

Do not present live vehicle tracking as available unless a verified
GPS/device integration exists.

## 18. HR, Payroll, and Leave (Planned)

-   Staff leave requests and approvals.
-   Leave types and balances.
-   Payroll components.
-   Salary records and payslips.
-   Attendance-linked payroll inputs.
-   Salary payment history.
-   Payroll reports.

Payroll and employment data require strict access controls and
jurisdiction-specific review.

## 19. Reports and Analytics

**Academic reports**

-   Student enrollment by class and campus.
-   Attendance percentage and trends.
-   Exam performance by subject/class.
-   Pass/fail distribution based on configured rules.
-   Student progress over academic terms.
-   Homework completion where tracked.

**Administrative reports**

-   Admission applications and conversion.
-   Student transfers and withdrawals.
-   Staff and teacher summaries.
-   Class capacity and allocation.
-   Campus comparison.

**Financial reports**

-   Fee collection by date, class, and campus.
-   Outstanding fees.
-   Discounts and concessions.
-   Refunds and adjustments.
-   Payment method breakdown.
-   Expense and payroll summaries where enabled.

Reports must clearly define date range, timezone, academic year, campus
scope, and calculation rules.

## 20. Multi-Institution SaaS Platform Administration

A separate platform-level workspace for operating the SaaS product.

**Planned capabilities**

-   Institution registration and onboarding.
-   Owner account creation.
-   Manual or automated institution approval.
-   Tenant activation, suspension, and reactivation.
-   Subscription plans and feature entitlements.
-   Campus/user/storage limits.
-   Billing integration and subscription status.
-   Platform-level audit logs.
-   Support workflows with strict access controls.
-   Platform usage and health overview.

Platform administrators should not casually browse private student
records. Any exceptional support access must be authorized, limited, and
audited.

------------------------------------------------------------------------

## Roles and Permissions

Roles are presets. The underlying authorization model should support
granular permissions and campus scope.

  -----------------------------------------------------------------------
  Role                                Typical access
  ----------------------------------- -----------------------------------
  Platform Super Admin                SaaS configuration and tenant
                                      lifecycle

  Institution Owner                   Full access to their institution

  School Admin                        Authorized academic and
                                      administrative management

  Principal / Head                    Academic oversight and institution
                                      reports

  Campus Manager                      Assigned campus operations

  Admission Officer                   Applications and enrollment

  Accountant                          Fees, payments, and financial
                                      reports

  Teacher                             Assigned classes, attendance,
                                      homework, and marks

  Class Teacher                       Assigned class oversight and
                                      permitted student records

  Parent / Guardian                   Linked student information

  Student                             Own permitted academic information

  Librarian                           Library catalog and circulation

  Transport Manager                   Transport operations

  Custom Role                         Explicitly configured permissions
  -----------------------------------------------------------------------

### Authorization rules

-   Apply least-privilege access by default.
-   Validate tenant membership and campus scope on every protected
    operation.
-   Enforce permissions on the server and in Firestore Rules where
    applicable.
-   Hiding a UI button is not a security boundary.
-   Parent access must be based on verified student-guardian
    relationships.
-   Teachers should access only assigned classes/students unless granted
    additional permission.
-   Restrict medical, financial, disciplinary, and identity documents to
    authorized roles.
-   Record sensitive actions in audit logs.

------------------------------------------------------------------------

## Core School Workflows

### New student admission

1.  Applicant or admission officer creates an application.
2.  Required student and guardian information is captured.
3.  Documents are uploaded securely.
4.  Admission staff reviews the application.
5.  Application is approved, rejected, or waitlisted.
6.  Approved applicant is enrolled in an academic year.
7.  Admission number is generated safely.
8.  Student is assigned to a campus, class, and section.
9.  Guardian portal invitation is sent through a verified process.

### Daily class attendance

1.  Teacher opens today's timetable or assigned class.
2.  Teacher selects the correct date/session.
3.  Student roster is loaded for the assigned class.
4.  Teacher marks attendance.
5.  System validates duplicate and date/session rules.
6.  Attendance is submitted with actor and timestamp.
7.  Authorized staff can review summaries and corrections.
8.  Parent notifications are sent only if configured and approved.

### Exam and result publication

1.  Admin creates an exam or assessment.
2.  Subjects, dates, classes, and grading rules are configured.
3.  Teachers enter marks for assigned subjects.
4.  System validates marks and missing entries.
5.  Authorized reviewer checks and approves results.
6.  Results are locked/published according to policy.
7.  Students and parents view permitted report cards.

### Fee collection

1.  Fee structure is assigned to a student or class.
2.  Invoice/voucher is generated for the billing period.
3.  Parent or student receives the permitted payment information.
4.  Accountant records or verifies payment.
5.  Payment receipt is generated.
6.  Student ledger and outstanding balance are updated.
7.  Daily collection report is available to authorized staff.

### Parent communication

1.  Staff creates a notice or message.
2.  Audience is selected by campus, class, or linked guardians.
3.  Content is reviewed for privacy and accuracy.
4.  Message is published or sent through a configured provider.
5.  Delivery status is recorded where available.
6.  Authorized staff can review communication history.

### Academic year rollover

1.  Admin closes the current academic period according to policy.
2.  Final results and required records are reviewed.
3.  Promotion/retention decisions are recorded.
4.  New academic year and class structure are configured.
5.  Eligible students are promoted or assigned.
6.  New enrollments and class rosters are verified.
7.  Historical academic records remain preserved.

------------------------------------------------------------------------

## Data Architecture

The following is a logical starting point. Exact collection placement
should be selected based on query patterns, Firestore security rules,
and data growth.

### Suggested Firestore structure

``` text
tenants/{tenantId}
  campuses/{campusId}
  members/{userId}
  invitations/{invitationId}
  roles/{roleId}
  academicYears/{academicYearId}
  terms/{termId}
  classes/{classId}
  sections/{sectionId}
  subjects/{subjectId}
  students/{studentId}
  guardians/{guardianId}
  staff/{staffId}
  enrollments/{enrollmentId}
  attendance/{attendanceId}
  timetables/{timetableId}
  exams/{examId}
  marks/{markId}
  results/{resultId}
  feeStructures/{feeStructureId}
  invoices/{invoiceId}
  payments/{paymentId}
  assignments/{assignmentId}
  submissions/{submissionId}
  notices/{noticeId}
  events/{eventId}
  documents/{documentId}
  auditLogs/{logId}
  settings/{documentId}

platformUsers/{userId}
platformAuditLogs/{logId}
```

This is a logical model, not a requirement to nest every collection
exactly as shown. High-volume collections may be better as tenant-scoped
top-level collections. Design around access patterns and rules.

### Common document fields

``` js
{
  tenantId: "tenant_id",
  campusId: "campus_id", // when campus-scoped
  status: "ACTIVE",
  createdAt: serverTimestamp(),
  createdBy: "user_id",
  updatedAt: serverTimestamp(),
  updatedBy: "user_id"
}
```

### Student concept

``` js
{
  tenantId: "tenant_id",
  campusId: "campus_id",
  admissionNumber: "STU-2026-001",
  firstName: "Example",
  lastName: "Student",
  enrollmentStatus: "ACTIVE",
  currentAcademicYearId: "academic_year_id",
  currentClassId: "class_id",
  currentSectionId: "section_id",
  guardianIds: ["guardian_id"],
  createdAt: "server timestamp",
  createdBy: "user_id"
}
```

Use only the personal fields required by the institution. Avoid copying
sensitive student data into documents that do not need it.

### Attendance concept

``` js
{
  tenantId: "tenant_id",
  campusId: "campus_id",
  academicYearId: "academic_year_id",
  classId: "class_id",
  sectionId: "section_id",
  studentId: "student_id",
  attendanceDate: "2026-11-06",
  sessionId: "morning",
  status: "PRESENT",
  markedBy: "teacher_user_id",
  markedAt: "server timestamp",
  updatedAt: "server timestamp"
}
```

Define a stable uniqueness strategy for the relevant attendance scope
(for example, tenant, campus, class/session, student, and date). Enforce
it in trusted logic; do not rely only on the UI.

### Fee invoice concept

``` js
{
  tenantId: "tenant_id",
  campusId: "campus_id",
  studentId: "student_id",
  academicYearId: "academic_year_id",
  invoiceNumber: "FEE-2026-001",
  billingPeriod: "2026-11",
  lineItems: [
    {
      feeType: "TUITION",
      description: "Monthly tuition",
      amountMinor: 500000
    }
  ],
  totalMinor: 500000,
  paidMinor: 0,
  balanceMinor: 500000,
  status: "UNPAID",
  dueDate: "2026-11-15",
  createdAt: "server timestamp"
}
```

Use integer minor currency units or a clearly defined decimal strategy.
Preserve historical fee descriptions and amounts after invoice creation.

### Data integrity guidelines

-   Keep academic year and campus context explicit.
-   Generate admission and invoice numbers safely in trusted code.
-   Use transactions or atomic operations for payments and related
    ledger updates.
-   Make payment-provider webhooks idempotent.
-   Preserve history for attendance corrections, marks changes, fee
    adjustments, and enrollment changes.
-   Define Firestore indexes for actual query patterns.
-   Avoid unbounded arrays and oversized documents.
-   Apply retention and archival policies appropriate to education
    records.
-   Keep audit logs for sensitive changes.

------------------------------------------------------------------------

## UI and UX Standards

### Every page should include

-   Clear page title and short purpose statement.
-   Primary action where relevant.
-   Loading, empty, error, and success states.
-   Responsive layout.
-   Permission-aware actions.
-   Helpful validation and error messages.
-   Consistent navigation and component patterns.

### Data tables

-   Search, filters, sorting, and pagination.
-   Column visibility for dense data.
-   Useful empty states and reset-filter actions.
-   Responsive card/list alternatives for mobile.
-   Confirmation for destructive bulk actions.
-   Accessible row actions and keyboard support.

### Forms

-   React Hook Form with Zod schemas.
-   Clear required and optional field indicators.
-   Inline field errors and helpful helper text.
-   Server error feedback.
-   Disabled/loading submit states.
-   Duplicate-submission prevention.
-   Safe preservation of entered data when dialogs open.

### Important interface states

Use consistent labels and treatments for:

-   Draft / Submitted / Under review.
-   Active / Inactive / Archived.
-   Present / Absent / Late / Excused.
-   Paid / Unpaid / Partially paid / Overdue.
-   Published / Unpublished.
-   Approved / Rejected / Pending.
-   Completed / Cancelled.

Do not rely on color alone to communicate a state.

------------------------------------------------------------------------

## Security and Student Data Privacy

Student records require careful privacy and access controls.

-   Firebase Authentication for identity.
-   Firestore Security Rules for client access.
-   Firebase Admin SDK for trusted server-side operations.
-   Firebase App Check where supported.
-   Server-side validation for sensitive mutations.
-   Zod schemas for untrusted input.
-   Tenant and campus authorization for every protected operation.
-   Parent-to-student relationship verification.
-   Teacher-to-class assignment verification.
-   Rate limiting for public forms and authentication-adjacent
    endpoints.
-   Secure HTTP-only sessions where custom sessions are used.
-   Environment variables for secrets.
-   Audit logs for admissions, marks, attendance, fees, and role
    changes.
-   Backups and documented recovery procedures.
-   Structured logs and production error monitoring.
-   Safe error messages that do not expose private records or stack
    traces.

### Privacy safeguards

-   Collect only information needed for a defined educational or
    administrative purpose.
-   Restrict medical, emergency, financial, disciplinary, and identity
    documents.
-   Do not expose student lists or records on public routes.
-   Do not allow parents to access unlinked students.
-   Do not allow teachers to access all student records by default.
-   Use secure, expiring access patterns for private file downloads
    where appropriate.
-   Define retention, correction, and deletion processes according to
    applicable law and institutional policy.
-   Obtain appropriate consent and authorization before publishing
    student photos, names, or achievements.
-   Review local legal requirements before production deployment.

------------------------------------------------------------------------

## Offline and Connectivity Strategy

Schools may have unreliable internet access. The system should degrade
gracefully.

**Planned approach**

-   Cache permitted reference data such as class lists and timetables.
-   Use IndexedDB with Dexie for supported local workflows.
-   Show online, offline, syncing, and sync-failed states.
-   Queue supported operations with stable client-generated IDs.
-   Retry safely when connectivity returns.
-   Detect conflicting attendance or marks updates.
-   Require review when automatic merging would be unsafe.
-   Protect locally cached student data, especially on shared devices.

**Important:** Offline support must be implemented and tested per
workflow. Do not advertise the entire platform as offline-capable until
local data protection, synchronization, conflict handling, and recovery
have been verified.

------------------------------------------------------------------------

## Project Structure

Suggested feature-oriented Next.js structure:

``` text
school-multi-management-os/
├── app/
│   ├── (marketing)/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── portal/
│   ├── teacher/
│   ├── student/
│   ├── parent/
│   ├── api/
│   ├── layout.js
│   └── globals.css
├── components/
│   ├── ui/
│   ├── shared/
│   ├── layout/
│   ├── dashboard/
│   └── marketing/
├── features/
│   ├── auth/
│   ├── tenants/
│   ├── campuses/
│   ├── admissions/
│   ├── students/
│   ├── guardians/
│   ├── staff/
│   ├── academics/
│   ├── attendance/
│   ├── timetable/
│   ├── exams/
│   ├── results/
│   ├── fees/
│   ├── assignments/
│   ├── communication/
│   ├── library/
│   ├── transport/
│   └── reports/
├── lib/
│   ├── firebase/
│   ├── auth/
│   ├── security/
│   ├── validation/
│   ├── services/
│   └── utils/
├── hooks/
├── store/
├── config/
├── public/
├── tests/
├── scripts/
├── .env.example
├── firestore.rules
├── firestore.indexes.json
├── package.json
└── README.md
```

Adapt this structure to the existing repository rather than moving files
only to match the example. Keep feature-specific components, schemas,
and services close to their feature.

------------------------------------------------------------------------

## Getting Started

### Prerequisites

-   Node.js version supported by the installed Next.js release.
-   npm.
-   Firebase project with Authentication and Cloud Firestore enabled.
-   Firebase Storage if document or image uploads are enabled.
-   Firebase Admin credentials for trusted server operations.
-   Git.

### Installation

``` bash
git clone <your-repository-url>
cd school-multi-management-os
npm install
```

Create a local environment file:

``` bash
cp .env.example .env.local
```

Add the Firebase and application configuration, then start development:

``` bash
npm run dev
```

Open `http://localhost:3000`.

Use the package manager and scripts already defined by the repository.
Do not mix npm, pnpm, and yarn lockfiles.

------------------------------------------------------------------------

## Environment Variables

Document variable names in `.env.example`, never real credentials.

Example categories (adjust names to match the actual Firebase
initialization code):

``` env
# Public Firebase web configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Server-only Firebase Admin configuration
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Public application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional integrations — only when implemented
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SENTRY_DSN=
```

Notes:

-   `NEXT_PUBLIC_` variables are exposed to the browser.
-   Keep Admin SDK credentials and payment secrets server-only.
-   Handle private-key newline formatting according to the Admin SDK
    initialization code.
-   Never commit `.env.local` or production credentials.
-   Remove unused variables from deployment configuration when
    integrations are not enabled.

------------------------------------------------------------------------

## Development Commands

Confirm actual script names in `package.json`.

``` bash
npm run dev       # Start local development
npm run build     # Create a production build
npm run start     # Run the production build locally
npm run lint      # Run lint checks
npm run test      # Run unit/component tests, if configured
npm run test:e2e  # Run Playwright tests, if configured
```

Before submitting a change:

1.  Run lint and relevant tests.
2.  Run a production build.
3.  Test the affected workflow using the correct role.
4.  Check desktop, tablet, and mobile layouts.
5.  Verify loading, empty, error, and permission-denied states.

------------------------------------------------------------------------

## Testing and Quality

Prioritize business-critical academic and administrative behavior.

### Unit tests

-   Fee, discount, and balance calculations.
-   Admission number generation rules.
-   Attendance uniqueness and percentage calculations.
-   Academic year and promotion rules.
-   Marks validation and grading calculations.
-   Timetable conflict detection.
-   Permission and campus-scope checks.
-   Parent/student relationship authorization.

### Integration tests

-   Authentication and tenant membership.
-   Campus-scoped Firestore access.
-   Student admission and enrollment.
-   Attendance creation and correction history.
-   Marks entry, review, and publication.
-   Invoice creation and payment ledger updates.
-   Private document access.
-   Parent portal access restrictions.

### End-to-end tests

-   Owner signs in and configures an academic year.
-   Admin creates a campus, class, section, and subject.
-   Admission officer enrolls a student and links a guardian.
-   Teacher marks attendance for an assigned class.
-   Teacher enters marks and an authorized reviewer publishes results.
-   Accountant generates a fee invoice and records payment.
-   Parent views only their linked student's information.
-   Student views their own timetable and results.
-   A user from one tenant cannot access another tenant's records.

Use synthetic test data. Never use real student records or production
credentials in automated tests.

------------------------------------------------------------------------

## Deployment

### Recommended deployment flow

1.  Create separate development, staging, and production Firebase
    projects where practical.
2.  Configure environment variables in the hosting platform.
3.  Review and deploy Firestore Security Rules and indexes.
4.  Run the production build.
5.  Deploy the Next.js application to Vercel or the selected host.
6.  Configure the production domain and HTTPS.
7.  Configure email/SMS/payment integrations only when implemented.
8.  Test tenant isolation, campus access, parent/teacher permissions,
    and critical workflows.
9.  Enable monitoring, backup, and recovery procedures.

### Production checklist

-   [ ] Production environment variables configured.
-   [ ] No secrets committed to Git.
-   [ ] Firestore rules reviewed and deployed.
-   [ ] Required indexes deployed.
-   [ ] Tenant and campus authorization tested.
-   [ ] Parent-to-student access verified.
-   [ ] Teacher-to-class access verified.
-   [ ] Student private documents protected.
-   [ ] Admin SDK restricted to server code.
-   [ ] App Check configured where appropriate.
-   [ ] Authentication and recovery tested.
-   [ ] Payment integrations verified, if enabled.
-   [ ] Backup and recovery process documented.
-   [ ] Error monitoring configured.
-   [ ] Privacy and data-retention requirements reviewed.
-   [ ] Mobile, tablet, and desktop layouts tested.

------------------------------------------------------------------------

## Development Roadmap

Build a secure academic foundation before adding every optional module.

### Phase 1 --- Foundation and Multi-Tenant Access

-   [ ] Next.js application shell and design system.
-   [ ] Firebase client and Admin SDK setup.
-   [ ] Authentication and protected routes.
-   [ ] Tenant onboarding and membership model.
-   [ ] Campus model and campus selector.
-   [ ] Roles, permissions, and Firestore Rules.
-   [ ] Loading, empty, error, and not-found states.

### Phase 2 --- Academic Structure and Student Records

-   [ ] Institution and campus settings.
-   [ ] Academic years and terms.
-   [ ] Classes, sections, and subjects.
-   [ ] Student and guardian management.
-   [ ] Admissions and enrollment.
-   [ ] Staff and teacher management.
-   [ ] Student profile and document access.

### Phase 3 --- Daily Academic Operations

-   [ ] Teacher workspace.
-   [ ] Timetable management.
-   [ ] Student attendance.
-   [ ] Attendance summaries and reports.
-   [ ] Homework and assignments.
-   [ ] Notices and events.

### Phase 4 --- Exams and Finance

-   [ ] Exam and assessment setup.
-   [ ] Marks entry and validation.
-   [ ] Grading rules and report cards.
-   [ ] Fee structures and invoices.
-   [ ] Payment recording and receipts.
-   [ ] Fee ledgers and outstanding reports.

### Phase 5 --- Parent/Student Portals and Reliability

-   [ ] Parent portal and verified guardian linking.
-   [ ] Student portal.
-   [ ] Notifications through approved providers.
-   [ ] Offline cache and safe sync for supported workflows.
-   [ ] Automated tests for critical permissions and workflows.
-   [ ] Monitoring, backups, and recovery drills.

### Phase 6 --- Advanced School SaaS

-   [ ] Platform admin console.
-   [ ] Tenant approval and lifecycle controls.
-   [ ] Subscription plans and feature entitlements.
-   [ ] Usage tracking and billing.
-   [ ] Library management.
-   [ ] Transport management.
-   [ ] HR, leave, and payroll.
-   [ ] Advanced analytics and exports.
-   [ ] Multi-campus comparisons and group-level reporting.

------------------------------------------------------------------------

## Engineering Principles

1.  **Student privacy first:** protect personal, academic, and financial
    records.
2.  **Correctness before convenience:** attendance, marks, fees, and
    enrollment must be reliable.
3.  **Clear permissions:** every role sees only the data required for
    its work.
4.  **Traceability:** preserve history for sensitive academic and
    financial changes.
5.  **Tenant isolation:** one institution must never access another
    institution's data.
6.  **Teacher-friendly workflows:** make daily attendance and marks
    entry fast and clear.
7.  **Parent-friendly communication:** present useful information
    without exposing private records.
8.  **Graceful recovery:** handle network and provider failures safely.
9.  **Responsive by default:** support school offices, classrooms, and
    family devices.
10. **Maintainable architecture:** keep business rules out of
    presentation components.
11. **Configurable academics:** avoid hardcoding grading systems, terms,
    and class structures.
12. **Honest feature status:** planned features are not described as
    completed.

------------------------------------------------------------------------

## License

Add an explicit license before distributing this project publicly or
commercially. Until a license is added, do not assume others have
permission to reuse, modify, or redistribute the code.
