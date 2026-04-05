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
        <section className="px-4 pb-14 pt-20 sm:px-6 lg:px-8">
          <div className="site-shell grid gap-8 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] xl:items-start xl:gap-10">
            <div className="max-w-[31rem] pt-2 sm:max-w-[33rem] xl:sticky xl:top-[calc(var(--navbar-height)+1.5rem)]">
              <span className="eyebrow-label">{surfaceNames.patient}</span>
              <h1 className="mt-[1.125rem] max-w-[28rem] text-[2.35rem] leading-[0.97] tracking-tight text-balance text-slate-950 sm:text-[2.72rem] xl:text-[3rem]">
                Start with the medication. The rest of the nearby search should
                feel guided, not crowded.
              </h1>
              <p className="mt-3.5 max-w-[29rem] text-[1rem] leading-7 text-slate-600 sm:text-[1.05rem]">
                Pharmacy Finder now moves through medication, strength if it
                matters, and location before it reveals the secondary controls.
                The nearby list stays live, and the stock boundary stays
                explicit.
              </p>

              <div className="mt-6 grid gap-3">
                <div className="rounded-[1.25rem] border border-white/80 bg-white/76 px-4 py-3 text-[0.92rem] leading-6 text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  Nearby pharmacies come from a live search, not a guaranteed
                  inventory feed.
                </div>
                <div className="rounded-[1.25rem] border border-white/80 bg-white/76 px-4 py-3 text-[0.92rem] leading-6 text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  Medication context stays separate so the first pharmacy call
                  remains clear about what still needs confirmation.
                </div>
              </div>
            </div>

            <div className="justify-self-stretch space-y-5">
              <PharmacySearchForm
                showSamples
                submitLabel="Find nearby pharmacies"
              />

              <div className="surface-panel grid gap-4 rounded-[1.65rem] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="max-w-[40rem]">
                  <span className="eyebrow-label">Keep the boundary clear</span>
                  <p className="mt-2.5 text-[0.92rem] leading-6 text-slate-600">
                    Use Pharmacy Finder for the live nearby shortlist. Open the
                    broader medication view when the question shifts from who to
                    call first to formulation coverage, manufacturer status, or
                    shortage planning.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link href="/prescriber" className="action-button-secondary text-sm">
                    {openSurfaceLabels.prescriber}
                  </Link>
                  <Link href="/methodology" className="action-button-secondary text-sm">
                    Open Methodology
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
