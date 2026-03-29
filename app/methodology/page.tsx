import { HealthStatusCard } from "@/components/search/health-status-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

const dataSources = [
  {
    label: "Google Places",
    description: "Live nearby pharmacy names, addresses, hours, ratings, and map links.",
    accent: "bg-sky-50 border-sky-200",
    dot: "bg-sky-500",
    eyebrow: "text-sky-600",
  },
  {
    label: "openFDA Shortages",
    description: "Active and resolved drug shortage records from the FDA shortage database.",
    accent: "bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
    eyebrow: "text-amber-600",
  },
  {
    label: "Drugs@FDA",
    description: "Approval history, application numbers, and formulation records.",
    accent: "bg-violet-50 border-violet-200",
    dot: "bg-violet-500",
    eyebrow: "text-violet-600",
  },
  {
    label: "FDA NDC Listings",
    description: "National Drug Code listings for manufacturer and packaging breadth.",
    accent: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
    eyebrow: "text-emerald-600",
  },
  {
    label: "FDA Recall Enforcement",
    description: "Recall and enforcement action records tied to specific drug families.",
    accent: "bg-rose-50 border-rose-200",
    dot: "bg-rose-500",
    eyebrow: "text-rose-600",
  },
  {
    label: "Crowd Signals",
    description: "User-submitted fill reports layered on top of FDA context where available.",
    accent: "bg-teal-50 border-teal-200",
    dot: "bg-teal-500",
    eyebrow: "text-teal-600",
  },
];

const boundaries = [
  { label: "Real-time shelf inventory at any specific store", available: false },
  { label: "Guaranteed same-day pickup", available: false },
  { label: "Insurance approval or copay outcome", available: false },
  { label: "Live nearby pharmacies", available: true },
  { label: "FDA shortage, recall, and approval records", available: true },
  { label: "Medication-wide access friction estimate", available: true },
];

const methodologyGuide = [
  {
    title: "Live nearby discovery",
    value: "Google Places",
    detail: "Pharmacy names, distance, hours, ratings, and map links come from the live nearby search.",
  },
  {
    title: "Medication context",
    value: "openFDA evidence",
    detail: "Shortages, recalls, approvals, and manufacturer breadth stay visible as separate evidence.",
  },
  {
    title: "Store-level stock",
    value: "Still manual",
    detail: "PharmaPath does not claim a specific pharmacy has inventory confirmed without a direct call.",
  },
];

export default function MethodologyPage() {
  return (
    <>
      <SiteNavbar />
      <main>
        {/* Hero */}
        <section className="px-4 pb-16 pt-28 sm:px-6 lg:px-8">
          <div className="site-shell grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <span className="eyebrow-label">Methodology</span>
              <h1 className="mt-6 text-[2.9rem] leading-tight tracking-tight text-slate-950 sm:text-[3.5rem]">
                What the data supports. What it doesn&apos;t.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Backed by five public data sources, with clear boundaries on every claim.
              </p>
            </div>
            <div className="surface-panel rounded-[2.25rem] bg-white/94 p-6 shadow-none backdrop-blur-none sm:p-8">
              <span className="eyebrow-label">Reading guide</span>
              <div className="mt-6 space-y-3">
                {methodologyGuide.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                      <span className="text-sm font-medium text-slate-500">{item.value}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Data sources */}
        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="site-shell">
            <span className="eyebrow-label">Data sources</span>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dataSources.map((source) => (
                <div
                  key={source.label}
                  className={`rounded-[2rem] border p-6 ${source.accent}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${source.dot}`} />
                    <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${source.eyebrow}`}>
                      {source.label}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-700">{source.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Boundaries and health */}
        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="site-shell grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
              <span className="eyebrow-label">Claim boundary</span>
              <h2 className="mt-4 text-2xl tracking-tight text-slate-950">
                What PharmaPath can state directly, and what still needs a call.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                The app keeps live nearby discovery, medication-wide evidence, and still-manual steps
                separate so the product never overstates store-level availability.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Shown directly
                  </span>
                  <ul className="mt-4 space-y-3">
                    {boundaries.filter((b) => b.available).map((b) => (
                      <li key={b.label} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                        <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-emerald-500" />
                        {b.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50/70 p-5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                    Still manual
                  </span>
                  <ul className="mt-4 space-y-3">
                    {boundaries.filter((b) => !b.available).map((b) => (
                      <li key={b.label} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                        <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-rose-400" />
                        {b.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <HealthStatusCard />
          </div>
        </section>

        {/* Two views */}
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="site-shell grid gap-5 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-sky-200 bg-sky-50 p-6">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Pharmacy Finder</span>
              <h2 className="mt-4 text-xl tracking-tight text-slate-950">Nearby list + access signal</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Google Places results ranked by distance and open status. One FDA-derived friction label. Questions to ask before calling.
              </p>
            </div>
            <div className="rounded-[2rem] border border-teal-200 bg-teal-50 p-6">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">Medication Lookup</span>
              <h2 className="mt-4 text-xl tracking-tight text-slate-950">Evidence trail intact</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Shortage records, recall history, manufacturer spread, and formulation context — without flattening it into a single label.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
