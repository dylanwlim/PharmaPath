import type { Metadata } from "next";
import Link from "next/link";
import { PageTransitionShell } from "@/components/page-transition-shell";
import { PharmacySearchForm } from "@/components/search/pharmacy-search-form";
import { CalloutList } from "@/components/search/shared";
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
        <section className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <div className="site-shell grid gap-8 xl:grid-cols-[minmax(0,1.06fr)_minmax(20rem,0.72fr)] xl:items-start xl:gap-8">
            <div className="max-w-[44rem] pt-2">
              <span className="eyebrow-label">{surfaceNames.patient}</span>
              <h1 className="mt-[1.125rem] max-w-[33rem] text-[2.35rem] leading-[0.97] tracking-tight text-balance text-slate-950 sm:text-[2.72rem] xl:text-[3rem]">
                Find nearby pharmacies for your medication.
              </h1>
              <p className="mt-3.5 max-w-[38rem] text-[1rem] leading-7 text-slate-600 sm:text-[1.05rem]">
                Search by medication, choose the strength if it matters, then
                enter where to look. The nearby list comes from live search, so
                availability still needs a quick call before pickup or transfer.
              </p>

              <PharmacySearchForm
                className="mt-7"
                showSamples
                submitLabel="Find nearby pharmacies"
              />
            </div>

            <aside className="space-y-4 xl:pt-14">
              <div className="surface-panel rounded-[1.65rem] p-4 sm:p-5">
                <span className="eyebrow-label">Use this to build the call list</span>
                <h2 className="mt-2.5 text-[1.18rem] tracking-tight text-slate-950">
                  Bring the details that make the first search precise.
                </h2>
                <CalloutList
                  className="mt-3.5"
                  items={[
                    "Search by the medication you need, not just the broader family name.",
                    "Choose the exact strength if multiple options can change the result.",
                    "Use a city, ZIP code, or address to set the nearby search area.",
                  ]}
                />
              </div>

              <div className="surface-panel rounded-[1.65rem] p-4 sm:p-5">
                <span className="eyebrow-label">Need the broader evidence view?</span>
                <p className="mt-2.5 text-[0.92rem] leading-6 text-slate-600">
                  Open Medication Lookup when the next question is about
                  manufacturer coverage, shortage planning, or formulation
                  context instead of which nearby pharmacy to call first.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/prescriber" className="action-button-secondary text-sm">
                    {openSurfaceLabels.prescriber}
                  </Link>
                  <Link href="/methodology" className="action-button-secondary text-sm">
                    Open Methodology
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </PageTransitionShell>
      <SiteFooter />
    </>
  );
}
