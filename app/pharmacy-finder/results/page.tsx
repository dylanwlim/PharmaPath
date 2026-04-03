import type { Metadata } from "next";
import { PageTransitionShell } from "@/components/page-transition-shell";
import { PatientResultsClient } from "@/components/search/patient-results-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

export const metadata: Metadata = {
  title: "Pharmacy Results | PharmaPath",
  description:
    "Review nearby pharmacy results and medication access context together without implying verified shelf inventory.",
  alternates: {
    canonical: "https://pharmapath.org/pharmacy-finder/results",
  },
};

type PharmacyFinderResultsPageProps = {
  searchParams: Promise<{
    query?: string;
    location?: string;
    locationPlaceId?: string;
    radiusMiles?: string;
    sortBy?: "best_match" | "distance" | "rating";
    onlyOpenNow?: string;
  }>;
};

export default async function PharmacyFinderResultsPage({
  searchParams,
}: PharmacyFinderResultsPageProps) {
  const params = await searchParams;

  return (
    <>
      <SiteNavbar />
      <PageTransitionShell>
        <PatientResultsClient
          initialQuery={params.query}
          initialLocation={params.location}
          initialLocationPlaceId={params.locationPlaceId}
          initialRadiusMiles={params.radiusMiles}
          initialSortBy={params.sortBy}
          initialOnlyOpenNow={params.onlyOpenNow}
        />
      </PageTransitionShell>
      <SiteFooter />
    </>
  );
}
