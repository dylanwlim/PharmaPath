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
        <section className="px-4 pb-28 pt-24 sm:px-6 lg:min-h-[calc(100vh-5rem)] lg:px-8 lg:pb-36">
          <div className="site-shell space-y-8 xl:space-y-10">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] xl:items-end xl:gap-8">
              <div className="max-w-[46rem] pt-2">
                <span className="eyebrow-label">{surfaceNames.patient}</span>
                <h1 className="mt-[1.125rem] max-w-[35rem] text-[2.35rem] leading-[0.97] tracking-tight text-balance text-slate-950 sm:text-[2.72rem] xl:text-[3rem]">
                  Find nearby pharmacies for your medication.
                </h1>
                <p className="mt-3.5 max-w-[40rem] text-[1rem] leading-7 text-slate-600 sm:text-[1.05rem]">
                  Search by medication, choose the strength if it matters, then
                  enter where to look. The nearby list comes from live search,
                  so availability still needs a quick call before pickup or
                  transfer.
                </p>
              </div>

              <div className="surface-panel rounded-[1.4rem] border-slate-200/80 bg-white/78 p-4 sm:p-5">
                <span className="eyebrow-label">Broader medication context</span>
                <p className="mt-2 text-[0.88rem] leading-6 text-slate-600">
                  Open Medication Lookup when the next question is about
                  shortage pressure, manufacturer coverage, or formulation
                  context instead of who to call first.
                </p>

                <div className="mt-3 flex flex-wrap gap-2.5">
                  <Link href="/prescriber" className="action-button-secondary px-4 py-3 text-sm">
                    {openSurfaceLabels.prescriber}
                  </Link>
                  <Link href="/methodology" className="action-button-secondary px-4 py-3 text-sm">
                    Open Methodology
                  </Link>
                </div>
              </div>
            </div>

            <PharmacySearchForm
              className="lg:min-h-[calc(100vh-15rem)]"
              showSamples
              submitLabel="Find nearby pharmacies"
            />
          </div>
        </section>
      </PageTransitionShell>
      <SiteFooter />
    </>
  );
}
