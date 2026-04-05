import type { Metadata } from "next";
import Link from "next/link";
import { PageTransitionShell } from "@/components/page-transition-shell";
import { PharmacySearchForm } from "@/components/search/pharmacy-search-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { openSurfaceLabels, surfaceNames } from "@/lib/surface-labels";

export const metadata: Metadata = {
  title: "Pharmacy Finder | PharmaPath",
  description:
    "Search a medication and location to find nearby pharmacies with medication access context, without overstating stock certainty.",
  alternates: {
    canonical: "https://pharmapath.org/pharmacy-finder",
  },
};

export default function PharmacyFinderPage() {
  return (
    <>
      <SiteNavbar />
      <PageTransitionShell>
        <section className="px-4 pb-16 pt-[calc(var(--navbar-height)+1rem)] sm:px-6 lg:px-8 lg:pb-20 lg:pt-[calc(var(--navbar-height)+1.15rem)]">
          <div className="site-shell space-y-5 sm:space-y-6">
            <div className="max-w-[47rem]">
              <span className="eyebrow-label">{surfaceNames.patient}</span>
              <h1 className="mt-4 max-w-[35rem] text-[2.22rem] leading-[0.98] tracking-tight text-balance text-slate-950 sm:text-[2.58rem] xl:text-[2.82rem]">
                Find nearby pharmacies for your medication.
              </h1>
              <p className="mt-3 max-w-[39rem] text-[0.98rem] leading-7 text-slate-600 sm:text-[1.02rem]">
                Search by medication, choose the strength when it matters, then
                enter where to look. The nearby list helps you decide who to
                call first. Availability still needs a quick pharmacy call
                before pickup or transfer.
              </p>
            </div>

            <PharmacySearchForm
              showSamples
              submitLabel="Find nearby pharmacies"
            />

            <div className="rounded-[1.2rem] border border-slate-200/85 bg-white/78 px-4 py-3.5 shadow-[0_1px_1px_rgba(15,23,42,0.03)] sm:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-[38rem]">
                  <p className="text-sm font-medium text-slate-900">
                    Need the fuller medication picture?
                  </p>
                  <p className="mt-1 text-[0.84rem] leading-6 text-slate-600">
                    Open Medication Lookup when you want shortage, manufacturer,
                    or recall context after you have the nearby call list.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href="/prescriber" className="action-button-secondary px-4 py-2.5 text-sm">
                    {openSurfaceLabels.prescriber}
                  </Link>
                  <Link href="/methodology" className="action-button-secondary px-4 py-2.5 text-sm">
                    Open {surfaceNames.methodology}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageTransitionShell>
      <SiteFooter />
    </>
  );
}
