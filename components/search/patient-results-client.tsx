"use client";

import NextLink from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  LoaderCircle,
  MapPin,
  PhoneCall,
} from "lucide-react";
import { CrowdSignalCard } from "@/components/crowd-signal/crowd-signal-card";
import { getDemoCrowdSignalSummary } from "@/lib/crowd-signal/demo-signals";
import {
  createPharmaPathClient,
  type DrugIntelligenceResponse,
  type PharmacySearchResponse,
} from "@/lib/pharmapath-client";
import { useAuth } from "@/lib/auth/auth-context";
import {
  buildCrowdSignalMap,
  buildSignalKey,
} from "@/lib/crowd-signal/scoring";
import { PharmacySearchForm } from "@/components/search/pharmacy-search-form";
import {
  EmptyState,
  MetricPill,
  formatMiles,
} from "@/components/search/shared";
import {
  ShortageIntelligencePanel,
  selectMedicationMatch,
} from "@/components/search/shortage-intelligence-panel";

const client = createPharmaPathClient();

type PharmacyResult = PharmacySearchResponse["results"][number];

function ResultDistanceChip({
  distanceMiles,
}: {
  distanceMiles: PharmacyResult["distance_miles"];
}) {
  return (
    <span className="flat-chip whitespace-nowrap">
      {formatMiles(distanceMiles)}
    </span>
  );
}

function RecommendedResultMeta({ result }: { result: PharmacyResult }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-600">
      <span className="flat-chip">
        {result.open_now === true
          ? "Open now"
          : result.open_now === false
            ? "Closed now"
            : "Hours unavailable"}
      </span>
      {result.rating ? (
        <span className="flat-chip">Rating {result.rating.toFixed(1)}</span>
      ) : null}
      <span className="flat-chip">{result.review_label}</span>
    </div>
  );
}

function buildPrescriberReviewHref(
  query: string,
  location: string,
  matchId: string,
) {
  return `/prescriber?${new URLSearchParams({
    query,
    id: matchId,
    location,
  }).toString()}`;
}

function PrescriberReviewCard({
  query,
  location,
  matchId,
}: {
  query: string;
  location: string;
  matchId: string;
}) {
  return (
    <div className="surface-panel rounded-[2rem] p-6">
      <span className="eyebrow-label">Next step</span>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        Move into the prescriber-facing view if you want the same medication
        family framed around shortage planning, formulation spread, and
        manufacturer coverage.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <NextLink
          href={buildPrescriberReviewHref(query, location, matchId)}
          className="action-button-dark text-sm"
        >
          Review prescriber view
        </NextLink>
      </div>
    </div>
  );
}

function MedicationContextError({ message }: { message: string }) {
  return (
    <div className="surface-panel rounded-[2rem] border-rose-200 bg-rose-50 p-6 text-rose-700">
      <div className="text-sm font-medium uppercase tracking-[0.18em]">
        Medication context unavailable
      </div>
      <p className="mt-3 text-base leading-7">{message}</p>
    </div>
  );
}

export function PatientResultsClient({
  initialQuery = "",
  initialLocation = "",
  initialLocationPlaceId = "",
  initialRadiusMiles,
  initialSortBy = "best_match",
  initialOnlyOpenNow,
}: {
  initialQuery?: string;
  initialLocation?: string;
  initialLocationPlaceId?: string;
  initialRadiusMiles?: string;
  initialSortBy?: "best_match" | "distance" | "rating";
  initialOnlyOpenNow?: string;
}) {
  const query = initialQuery.trim();
  const location = initialLocation.trim();
  const locationPlaceId = initialLocationPlaceId.trim();
  const radiusMiles = Number(initialRadiusMiles || 5);
  const sortBy = initialSortBy || "best_match";
  const onlyOpenNow = initialOnlyOpenNow === "true";
  const { user } = useAuth();
  const lastSavedRecentSearchKeyRef = useRef<string | null>(null);
  const hasSearchInput = Boolean(query && location);

  const [pharmacyData, setPharmacyData] =
    useState<PharmacySearchResponse | null>(null);
  const [drugData, setDrugData] = useState<DrugIntelligenceResponse | null>(
    null,
  );
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [drugError, setDrugError] = useState<string | null>(null);
  const [crowdSignals, setCrowdSignals] = useState<
    Record<string, ReturnType<typeof buildCrowdSignalMap>[string]>
  >({});
  const [crowdReady, setCrowdReady] = useState(false);
  const [isLoading, setIsLoading] = useState(hasSearchInput);
  const [showAll, setShowAll] = useState(false);

  const featuredMatch = useMemo(
    () =>
      selectMedicationMatch(drugData?.matches, {
        featuredId: drugData?.featured_match_id,
      }),
    [drugData],
  );

  useEffect(() => {
    setShowAll(false);

    if (!query || !location) {
      setPharmacyData(null);
      setDrugData(null);
      setPharmacyError(null);
      setDrugError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    Promise.allSettled([
      client.searchPharmacies({
        medication: query,
        location,
        locationPlaceId: locationPlaceId || undefined,
        radiusMiles,
        sortBy,
        onlyOpenNow,
      }),
      client.getDrugIntelligence(query),
    ]).then(([pharmacyResult, drugResult]) => {
      if (cancelled) {
        return;
      }

      if (pharmacyResult.status === "fulfilled") {
        setPharmacyData(pharmacyResult.value);
        setPharmacyError(null);
      } else {
        setPharmacyData(null);
        setPharmacyError(
          pharmacyResult.reason?.message || "Unable to load nearby pharmacies.",
        );
      }

      if (drugResult.status === "fulfilled") {
        setDrugData(drugResult.value);
        setDrugError(null);
      } else {
        setDrugData(null);
        setDrugError(
          drugResult.reason?.message ||
            "Unable to load medication intelligence.",
        );
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [query, location, locationPlaceId, radiusMiles, sortBy, onlyOpenNow]);

  useEffect(() => {
    if (!query) {
      setCrowdSignals({});
      setCrowdReady(true);
      return;
    }

    setCrowdReady(false);
    let cancelled = false;
    let unsubscribe: () => void = () => undefined;

    void import("@/lib/crowd-signal/firestore")
      .then(({ subscribeToCrowdReportsForMedication }) => {
        if (cancelled) {
          return;
        }

        unsubscribe = subscribeToCrowdReportsForMedication(query, (reports) => {
          setCrowdSignals(buildCrowdSignalMap(reports));
          setCrowdReady(true);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setCrowdSignals({});
          setCrowdReady(true);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [query]);

  useEffect(() => {
    if (!user || !query || !location) {
      return;
    }

    const recentSearchKey = [
      user.uid,
      query.trim().toLowerCase(),
      location.trim().toLowerCase(),
      String(radiusMiles),
    ].join("::");

    if (lastSavedRecentSearchKeyRef.current === recentSearchKey) {
      return;
    }

    lastSavedRecentSearchKeyRef.current = recentSearchKey;

    void import("@/lib/profile/profile-service")
      .then(({ saveRecentSearch }) =>
        saveRecentSearch(user.uid, {
          medication: query,
          location,
          radiusMiles,
        }),
      )
      .catch(() => {
        if (lastSavedRecentSearchKeyRef.current === recentSearchKey) {
          lastSavedRecentSearchKeyRef.current = null;
        }
      });
  }, [location, query, radiusMiles, user]);

  const extraResults = pharmacyData?.results.slice(1) || [];
  const visibleExtras = showAll ? extraResults : extraResults.slice(0, 4);
  const isDemoMedication = Boolean(
    pharmacyData?.medication_profile.demo_only ||
    featuredMatch?.demo_context?.demo_only ||
    drugData?.data_source === "demo",
  );

  function resolveCrowdSignalSummary(
    result: PharmacySearchResponse["results"][number],
    demoIndex = 0,
  ) {
    const lookupKey = buildSignalKey({
      medicationQuery: query,
      placeId: result.place_id,
      pharmacyName: result.name,
      pharmacyAddress: result.address,
    });

    return isDemoMedication
      ? getDemoCrowdSignalSummary(lookupKey, demoIndex)
      : crowdSignals[lookupKey];
  }

  return (
    <>
      <section className="px-4 pb-10 pt-26 sm:px-6 lg:px-8">
        <div className="site-shell grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start xl:gap-12">
          <div className="max-w-[32rem] pt-2">
            <span className="eyebrow-label">Pharmacy Results</span>
            <h1 className="mt-6 text-[2.85rem] leading-[0.96] tracking-tight text-balance text-slate-950 sm:text-[3.2rem] xl:text-[3.55rem]">
              Nearby pharmacies first. Medication context alongside it.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              {isDemoMedication
                ? "This search keeps the live nearby list and the clearly labeled demo medication profile together, while staying explicit that the medication context is simulated."
                : "This search keeps the live nearby list and medication access context together without blurring them into a claim of verified shelf inventory."}
            </p>
          </div>

          <PharmacySearchForm
            className="justify-self-stretch"
            initialMedication={query}
            initialLocation={location}
            initialLocationPlaceId={locationPlaceId || undefined}
            initialRadiusMiles={radiusMiles}
            initialSortBy={sortBy}
            initialOnlyOpenNow={onlyOpenNow}
            compact
            submitLabel="Refresh nearby search"
          />
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="site-shell space-y-8">
          {!query || !location ? (
            <EmptyState
              eyebrow="Ready when you are"
              title="Enter a medication and a location to load Pharmacy Finder."
              body="PharmaPath combines a live nearby pharmacy lookup with medication access context without claiming any pharmacy has the medication confirmed on the shelf."
            />
          ) : isLoading ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(20rem,0.98fr)]">
              <div className="surface-panel flex min-h-[28rem] items-center justify-center rounded-[2rem]">
                <div className="flex items-center gap-3 text-slate-500">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Loading nearby options and medication context…
                </div>
              </div>
              <div className="surface-panel min-h-[28rem] rounded-[2rem] p-6" />
            </div>
          ) : (
            <>
              {isDemoMedication ? (
                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/85 px-5 py-4 text-sm leading-6 text-amber-950">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="eyebrow-label text-amber-700">
                      Demo medication
                    </span>
                    <span className="rounded-full border border-amber-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                      Simulated
                    </span>
                  </div>
                  <p className="mt-2">
                    {pharmacyData?.medication_profile.demo_note ||
                      featuredMatch?.demo_context?.note}
                  </p>
                  <p className="mt-1 text-amber-900/80">
                    {pharmacyData?.medication_profile.simulated_user_count ||
                      featuredMatch?.demo_context?.simulated_user_count ||
                      0}{" "}
                    seeded demo users are included for this fictional medication
                    variant. Live pharmacy results stay real, and
                    pharmacy-specific crowd reports remain a separate layer.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(20rem,0.98fr)] xl:items-start">
                <div className="space-y-6">
                  <div className="surface-panel rounded-[2.05rem] p-5 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="eyebrow-label">
                          Live nearby pharmacies
                        </span>
                        <h2 className="mt-4 text-2xl tracking-tight text-balance text-slate-950">
                          {pharmacyData?.location.display_label ||
                            pharmacyData?.location.formatted_address ||
                            location}
                        </h2>
                      </div>
                      {pharmacyData ? (
                        <div className="grid w-full grid-cols-3 gap-3 sm:w-auto sm:min-w-[22rem]">
                          <MetricPill
                            label="Results"
                            value={String(pharmacyData.counts.total)}
                          />
                          <MetricPill
                            label="Open now"
                            value={String(pharmacyData.counts.open_now)}
                          />
                          <MetricPill
                            label="Hours unknown"
                            value={String(pharmacyData.counts.hours_unknown)}
                          />
                        </div>
                      ) : null}
                    </div>

                    {pharmacyError ? (
                      <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 text-rose-700">
                        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em]">
                          <AlertCircle className="h-4 w-4" />
                          Nearby lookup unavailable
                        </div>
                        <p className="mt-3 text-base leading-7">
                          {pharmacyError}
                        </p>
                      </div>
                    ) : pharmacyData?.recommended ? (
                      <div className="mt-6 space-y-5">
                        <div className="rounded-[1.8rem] border border-slate-200/95 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.92)_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <div className="text-sm uppercase tracking-[0.18em] text-slate-500">
                                Recommended first call
                              </div>
                              <h3 className="mt-2 text-[1.75rem] tracking-tight text-slate-950">
                                {pharmacyData.recommended.name}
                              </h3>
                              <p className="mt-2 text-base leading-7 text-slate-600">
                                {pharmacyData.recommended.address}
                              </p>
                            </div>
                            <ResultDistanceChip
                              distanceMiles={
                                pharmacyData.recommended.distance_miles
                              }
                            />
                          </div>

                          <RecommendedResultMeta
                            result={pharmacyData.recommended}
                          />

                          <p className="mt-5 text-base leading-7 text-slate-700">
                            {pharmacyData.recommended.match_reason}
                          </p>

                          <div className="mt-5 rounded-[1.4rem] border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
                            <div className="font-medium">
                              Suggested question
                            </div>
                            <p className="mt-2">
                              {pharmacyData.recommended.next_step}
                            </p>
                          </div>

                          <div className="mt-5">
                            <CrowdSignalCard
                              medicationQuery={query}
                              medicationContext={
                                pharmacyData?.medication_profile
                              }
                              pharmacy={{
                                name: pharmacyData.recommended.name,
                                address: pharmacyData.recommended.address,
                                placeId: pharmacyData.recommended.place_id,
                                googleMapsUrl:
                                  pharmacyData.recommended.google_maps_url,
                              }}
                              summary={resolveCrowdSignalSummary(
                                pharmacyData.recommended,
                                0,
                              )}
                            />
                          </div>

                          <div className="mt-5 flex flex-wrap items-center gap-3">
                            {pharmacyData.recommended.google_maps_url ? (
                              <a
                                href={pharmacyData.recommended.google_maps_url}
                                target="_blank"
                                rel="noreferrer"
                                className="action-button-dark text-sm"
                              >
                                Open map
                              </a>
                            ) : null}
                            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                              <PhoneCall className="h-4 w-4" />
                              Inventory still needs a direct call.
                            </div>
                          </div>
                        </div>

                        {visibleExtras.length ? (
                          <div className="surface-panel rounded-[1.8rem] p-5 sm:p-6">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="text-xl tracking-tight text-slate-950">
                                Other nearby options
                              </h3>
                              {extraResults.length > 4 ? (
                                <button
                                  type="button"
                                  className="text-sm text-[#156d95]"
                                  onClick={() => setShowAll((value) => !value)}
                                >
                                  {showAll
                                    ? "Show fewer"
                                    : `Show ${extraResults.length - 4} more`}
                                </button>
                              ) : null}
                            </div>
                            <div className="mt-4 space-y-3">
                              {visibleExtras.map((result, resultIndex) => (
                                <div
                                  key={`${result.name}-${result.address}`}
                                  className="rounded-[1.4rem] border border-slate-200 bg-white p-4"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <div className="text-lg tracking-tight text-slate-900">
                                        {result.name}
                                      </div>
                                      <div className="mt-1 text-sm text-slate-500">
                                        {result.address}
                                      </div>
                                    </div>
                                    <ResultDistanceChip
                                      distanceMiles={result.distance_miles}
                                    />
                                  </div>
                                  <p className="mt-3 text-sm leading-6 text-slate-600">
                                    {result.match_reason}
                                  </p>
                                  <div className="mt-3">
                                    <CrowdSignalCard
                                      medicationQuery={query}
                                      medicationContext={
                                        pharmacyData?.medication_profile
                                      }
                                      pharmacy={{
                                        name: result.name,
                                        address: result.address,
                                        placeId: result.place_id,
                                        googleMapsUrl: result.google_maps_url,
                                      }}
                                      summary={resolveCrowdSignalSummary(
                                        result,
                                        resultIndex + 1,
                                      )}
                                      compact
                                    />
                                  </div>
                                  {result.google_maps_url ? (
                                    <a
                                      href={result.google_maps_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-3 inline-flex items-center gap-2 text-sm text-[#156d95]"
                                    >
                                      View map
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-600">
                          <div className="flex items-center gap-2 font-medium text-slate-900">
                            <MapPin className="h-4 w-4 text-[#156d95]" />
                            {pharmacyData.disclaimer}
                          </div>
                          <p className="mt-2">
                            {pharmacyData.guidance.demo_boundary} Community
                            reports sit on top of the live nearby list as a
                            separate, weighted layer rather than as a claim of
                            verified shelf inventory.
                            {pharmacyData.medication_profile.demo_only
                              ? " This medication profile is simulated for the demo and is intentionally separated from the main medication reference flow."
                              : ""}
                          </p>
                          {!crowdReady ? (
                            <div className="mt-3 flex items-center gap-2 text-slate-500">
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              Loading crowd signal...
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 text-slate-600">
                        No nearby pharmacy results surfaced for this search. Try
                        a broader location or a larger radius.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {drugError ? (
                    <MedicationContextError message={drugError} />
                  ) : featuredMatch ? (
                    <div className="space-y-6">
                      <ShortageIntelligencePanel
                        match={featuredMatch}
                        dataFreshness={drugData!.data_freshness}
                        variant="patient"
                      />
                      <PrescriberReviewCard
                        query={query}
                        location={location}
                        matchId={featuredMatch.id}
                      />
                    </div>
                  ) : (
                    <EmptyState
                      eyebrow="No clear match"
                      title={`No medication context matched "${query}".`}
                      body="No active shortage or recall context matched this medication. Try simplifying the medication name."
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
