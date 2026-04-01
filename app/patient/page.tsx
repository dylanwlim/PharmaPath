import Link from "next/link";
import { PageTransitionShell } from "@/components/page-transition-shell";
import { ExampleScenarioGrid } from "@/components/search/example-scenario-grid";
import { PharmacySearchForm } from "@/components/search/pharmacy-search-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { openSurfaceLabels, surfaceNames } from "@/lib/surface-labels";

export default function PatientPage() {
  return (
    <>
      <SiteNavbar />
      <PageTransitionShell>
        <section className="px-4 pb-16 pt-26 sm:px-6 lg:px-8">
          <div className="site-shell grid gap-8 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-14">
            <div className="max-w-[34rem] pt-2">
              <span className="eyebrow-label">{surfaceNames.patient}</span>
              <h1 className="mt-6 text-[2.95rem] leading-[0.96] tracking-tight text-balance text-slate-950 sm:text-[3.35rem] xl:text-[3.7rem]">
                Search a medication and location without pretending the stock is
                guaranteed.
              </h1>
              <p className="mt-5 max-w-[32rem] text-lg leading-8 text-slate-600">
                Pharmacy Finder keeps the live nearby list, medication context,
                and next question separate so the first call stays clear.
              </p>
            </div>

            <PharmacySearchForm
              className="justify-self-stretch"
              showSamples
              submitLabel="Find nearby pharmacies"
            />
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="site-shell">
            <ExampleScenarioGrid
              mode="patient"
              eyebrow="Quick starts"
              title="Four quick-start searches, each tuned to a real workflow."
              description="Use these to move through realistic medication and location combinations without implying store-level inventory."
            />

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/prescriber"
                className="action-button-secondary text-sm"
              >
                {openSurfaceLabels.prescriber}
              </Link>
            </div>
          </div>
        </section>
      </PageTransitionShell>
      <SiteFooter />
    </>
  );
}
