import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  School,
  Users,
  BookOpen,
  ClipboardCheck,
  Wallet,
  BarChart3,
  ShieldCheck,
  CalendarDays,
  CheckCircle2,
  Building2,
  Library,
  Bus,
} from "lucide-react";

const features = [
  {
    icon: School,
    title: "Multi-School Management",
    description:
      "Manage multiple schools, campuses and branches through one centralized platform.",
  },
  {
    icon: Users,
    title: "Student Management",
    description:
      "Maintain student profiles, admissions, academic records and enrollment history.",
  },
  {
    icon: GraduationCap,
    title: "Teacher Management",
    description:
      "Organize teachers, staff profiles, assignments, departments and responsibilities.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance Management",
    description:
      "Track daily student and staff attendance with organized attendance reports.",
  },
  {
    icon: Wallet,
    title: "Fee & Finance Management",
    description:
      "Manage fee structures, invoices, payments, outstanding balances and financial reports.",
  },
  {
    icon: BookOpen,
    title: "Exams & Results",
    description:
      "Create examinations, manage marks, calculate grades and publish student results.",
  },
  {
    icon: CalendarDays,
    title: "Timetable Management",
    description:
      "Organize classes, subjects, teacher schedules and academic calendars.",
  },
  {
    icon: Library,
    title: "Library Management",
    description:
      "Manage books, borrowing records, returns and library inventory.",
  },
  {
    icon: Bus,
    title: "Transport Management",
    description:
      "Organize school routes, vehicles, drivers and student transport assignments.",
  },
];

const benefits = [
  "Centralized multi-school administration",
  "Complete student and staff records",
  "Online admissions and enrollment",
  "Attendance and academic tracking",
  "Fee collection and financial reporting",
  "Examination and result management",
  "Parent and student portals",
  "Role-based access and permissions",
];

const stats = [
  { value: "01", label: "Centralized Platform" },
  { value: "24/7", label: "System Accessibility" },
  { value: "360°", label: "School Management" },
  { value: "Multi", label: "Campus Support" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">
                EduManage
              </span>
              <p className="text-[10px] font-medium tracking-widest text-muted-foreground">
                SCHOOL MANAGEMENT SYSTEM
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">
              Features
            </a>
            <a href="#solutions" className="transition hover:text-foreground">
              Solutions
            </a>
            <a href="#about" className="transition hover:text-foreground">
              About
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-semibold transition hover:bg-muted sm:inline-flex"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 py-24 sm:px-8 sm:py-32">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />

        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-xs font-semibold">
              <GraduationCap className="size-4 text-primary" />
              Complete School Management Solution
            </div>

            <h1 className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Manage your entire school with{" "}
              <span className="text-primary">one powerful system.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              Simplify school administration, student management, teacher
              operations, attendance, fees, examinations and academic activities
              through one intelligent management platform.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition hover:-translate-y-0.5 hover:opacity-90"
              >
                Get Started Today
                <ArrowRight className="size-4" />
              </Link>

              <a
                href="#features"
                className="inline-flex h-12 items-center rounded-xl border px-6 text-sm font-semibold transition hover:bg-muted"
              >
                Explore Features
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                Multi-Campus Support
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                Secure Management
              </span>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="relative">
            <div className="rounded-2xl border bg-card p-4 shadow-2xl shadow-black/5 sm:p-6">
              <div className="flex items-center justify-between border-b pb-5">
                <div>
                  <p className="text-sm font-bold">School Overview</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Academic management dashboard
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Dashboard
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-4">
                {[
                  { icon: Users, label: "Students", value: "Students" },
                  { icon: GraduationCap, label: "Teachers", value: "Faculty" },
                  { icon: School, label: "Classes", value: "Classes" },
                  { icon: ClipboardCheck, label: "Attendance", value: "Daily" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border bg-muted/30 p-3"
                    >
                      <Icon className="size-5 text-primary" />
                      <p className="mt-3 text-xs text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-bold">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold">Academic Performance</p>
                  <BarChart3 className="size-4 text-primary" />
                </div>

                <div className="flex h-28 items-end gap-3">
                  {[35, 55, 42, 78, 60, 90, 72, 100, 68, 85, 58, 95].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-md bg-primary/70 transition-all hover:bg-primary"
                        style={{ height: `${height}%` }}
                      />
                    ),
                  )}
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Illustrative dashboard preview
                </p>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-5 hidden items-center gap-3 rounded-xl border bg-background p-4 shadow-xl sm:flex">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <ShieldCheck className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">Secure Administration</p>
                <p className="text-xs text-muted-foreground">
                  Role-based access control
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/20 px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold tracking-tight text-primary">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Complete Features
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your school needs
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Manage every aspect of your educational institution with
              integrated tools designed for modern schools.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border bg-card p-7 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5"
                >
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-6" />
                  </div>

                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section
        id="solutions"
        className="border-y bg-muted/20 px-5 py-24 sm:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              One Platform, Multiple Solutions
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Built for every level of education
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Building2,
                title: "School Owners",
                description:
                  "Manage multiple institutions, campuses, administrators and overall business performance.",
              },
              {
                icon: GraduationCap,
                title: "Teachers & Staff",
                description:
                  "Manage classes, attendance, lessons, examinations and student progress.",
              },
              {
                icon: Users,
                title: "Parents & Students",
                description:
                  "Access attendance, fee records, homework, examination results and announcements.",
              },
            ].map((solution) => {
              const Icon = solution.icon;

              return (
                <div
                  key={solution.title}
                  className="rounded-2xl border bg-card p-7"
                >
                  <Icon className="size-9 text-primary" />
                  <h3 className="mt-6 text-xl font-bold">{solution.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {solution.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="about" className="px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Smarter School Administration
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Spend less time on paperwork and more time on education.
            </h2>

            <p className="mt-5 max-w-xl leading-8 text-muted-foreground">
              Bring your administrative and academic operations together. Give
              school owners, administrators, teachers, parents and students the
              tools they need in one connected ecosystem.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-muted/30 p-8 sm:p-12">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <GraduationCap className="size-7" />
            </div>

            <h3 className="mt-7 text-2xl font-bold">
              One system for your entire educational institution.
            </h3>

            <p className="mt-4 leading-8 text-muted-foreground">
              From admissions to graduation, organize academic activities,
              manage school resources and keep your entire community connected.
            </p>

            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary hover:gap-3"
            >
              Start managing your school
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-primary px-7 py-16 text-center text-primary-foreground sm:px-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to transform your school management?
          </h2>

          <p className="mx-auto mt-5 max-w-xl leading-7 opacity-85">
            Bring your students, teachers, administration and campuses together
            with one complete school management solution.
          </p>

          <Link
            href="/register"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-background px-6 text-sm font-bold text-foreground transition hover:opacity-90"
          >
            Create Your Account
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-foreground"
          >
            <GraduationCap className="size-5 text-primary" />
            EduManage
          </Link>

          <p>© {new Date().getFullYear()} EduManage. All rights reserved.</p>

          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
