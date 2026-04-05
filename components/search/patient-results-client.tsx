"use client";

import NextLink from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
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
  MedicationAccessSnapshotCard,
  MedicationContextDetails,
  selectMedicationMatch,
} from "@/components/search/shortage-intelligence-panel";
import { cn } from "@/lib/utils";

const client = createPharmaPathClient();

type PharmacyResult = PharmacySearchResponse["results"][number];
const pharmacyCardBaseClass =
  "rounded-[1.28rem] bg-white/96 transform-gpu transition-[background-color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:transition-none";
const recommendedPharmacyCardClass =
  `${pharmacyCardBaseClass} border border-emerald-200/80 shadow-[0_12px_26px_rgba(34,197,94,0.05)] hover:-translate-y-[1px] hover:border-emerald-300/90 hover:bg-emerald-50/[0.22] hover:shadow-[0_16px_34px_rgba(34,197,94,0.08)]`;
const standardPharmacyCardClass =
  `${pharmacyCardBaseClass} border border-slate-200/90 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:-translate-y-[1px] hover:border-slate-300/90 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]`;
const pharmacyActionButtonClass =
  "inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-[#156d95] transition hover:border-[#156d95]/30 hover:text-[#0f5d7d]";
const pharmacyActionButtonCompactClass =
  "inline-flex min-h-8 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.88rem] font-medium text-[#156d95] transition hover:border-[#156d95]/30 hover:text-[#0f5d7d]";

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

function PharmacyMapAction({
  href,
}: {
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={pharmacyActionButtonClass}
    >
      <ExternalLink className="h-4 w-4" />
      <span>View map</span>
    </a>
  );
}

function PharmacyActionRow({
  pharmacy,
  compact = false,
}: {
  pharmacy: PharmacyResult;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PharmacyPhoneAction
          pharmacy={pharmacy}
          className={pharmacyActionButtonCompactClass}
        />
        {pharmacy.google_maps_url ? (
          <PharmacyMapActionCompact href={pharmacy.google_maps_url} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2.5">
      <PharmacyPhoneAction
        pharmacy={pharmacy}
        className={pharmacyActionButtonClass}
      />
      {pharmacy.google_maps_url ? (
        <PharmacyMapAction href={pharmacy.google_maps_url} />
      ) : null}
      <div className="inline-flex items-center gap-2 text-[0.8rem] text-slate-500">
        <PhoneCall className="h-4 w-4" />
        Call to confirm stock before pickup or transfer.
      </div>
    </div>
  );
}

function PharmacyMapActionCompact({
  href,
}: {
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={pharmacyActionButtonCompactClass}
    >
      <ExternalLink className="h-4 w-4" />
      <span>View map</span>
    </a>
  );
}

function PharmacyAvailabilityMeta({
  result,
  compact = false,
}: {
  result: PharmacyResult;
  compact?: boolean;
}) {
  const statusLabel =
    result.hours_status_label ||
    (result.open_now === true
      ? "Open now"
      : result.open_now === false
        ? "Closed now"
        : "Hours unavailable");

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        compact ? "text-xs" : "text-sm"
      } text-slate-600`}
    >
      <span className="flat-chip">{statusLabel}</span>
      {result.hours_detail_label ? (
        <span className={compact ? "text-xs text-slate-500" : "text-sm text-slate-500"}>
          {result.hours_detail_label}
        </span>
      ) : null}
      {result.rating ? (
        <span className="flat-chip">Rating {result.rating.toFixed(1)}</span>
      ) : null}
      <span className="flat-chip">{result.review_label}</span>
    </div>
  );
}

function buildMedicationLookupHref(
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

function MedicationLookupCard({
  query,
  location,
  matchId,
}: {
  query: string;
  location: string;
  matchId: string;
}) {
  return (
    <div className="surface-panel rounded-[1.45rem] p-4 sm:p-5">
      <span className="eyebrow-label">Next step</span>
      <h3 className="mt-2.5 text-[1.06rem] tracking-tight text-slate-950">
        Need the fuller medication picture?
      </h3>
      <p className="mt-2 text-[0.92rem] leading-6 text-slate-600">
        Open Medication Lookup when you want shortage, manufacturer, and
        recall context behind this search.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {["Dose coverage", "Manufacturer status", "Recall context"].map(
          (item) => (
            <span key={item} className="flat-chip text-[0.82rem]">
              {item}
            </span>
          ),
        )}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-3">
        <NextLink
          href={buildMedicationLookupHref(query, location, matchId)}
          className="action-button-primary text-sm"
        >
          Open Medication Lookup
        </NextLink>
      </div>
    </div>
  );
}

function SearchGuidanceCard({
  pharmacyData,
  compact = false,
}: {
  pharmacyData: PharmacySearchResponse;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "surface-panel rounded-[1.45rem] p-4 sm:p-5",
        compact && "rounded-[1.35rem] p-4",
      )}
    >
      <span className="eyebrow-label">First call focus</span>
      <h2
        className={cn(
          "mt-2.5 tracking-tight text-slate-950",
          compact ? "text-[1rem]" : "text-[1.06rem]",
        )}
      >
        Why this pharmacy is first.
      </h2>
      <p
        className={cn(
          "mt-2 leading-6 text-slate-600",
          compact ? "text-[0.86rem] line-clamp-3" : "text-[0.9rem]",
        )}
      >
        {pharmacyData.guidance.summary}
      </p>

      <div
        className={cn(
          "mt-3 rounded-[1rem] border border-slate-200 bg-slate-50/82 px-4 py-3",
          compact && "px-3.5 py-2.5",
        )}
      >
        <div className="text-[0.64rem] uppercase tracking-[0.16em] text-slate-500">
          Ask first
        </div>
        <p
          className={cn(
            "mt-1 font-medium leading-6 text-slate-900",
            compact ? "text-[0.88rem]" : "text-sm",
          )}
        >
          {pharmacyData.guidance.recommended_action}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {pharmacyData.guidance.tags.slice(0, compact ? 2 : 3).map((tag) => (
          <span key={tag} className="flat-chip text-[0.82rem]">
            {tag}
          </span>
        ))}
      </div>

      <p
        className={cn(
          "mt-3 leading-5 text-slate-500",
          compact ? "text-[0.74rem]" : "text-[0.78rem]",
        )}
      >
        {pharmacyData.disclaimer}
      </p>
    </div>
  );
}

function PharmacyPhoneAction({
  pharmacy,
  className,
}: {
  pharmacy: PharmacyResult;
  className: string;
}) {
  if (!pharmacy.phone_number) {
    return null;
  }

  const label = pharmacy.phone_link ? `Call ${pharmacy.phone_number}` : `Phone ${pharmacy.phone_number}`;

  if (pharmacy.phone_link) {
    return (
      <a
        href={pharmacy.phone_link}
        aria-label={`Call ${pharmacy.name} at ${pharmacy.phone_number}`}
        className={className}
      >
        <PhoneCall className="h-4 w-4" />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <div className={className}>
      <PhoneCall className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}

function MedicationContextError({ message }: { message: string }) {
  return (
    <div className="surface-panel rounded-[1.55rem] border-rose-200 bg-rose-50 p-4 text-rose-700 sm:p-5">
      <div className="text-sm font-medium uppercase tracking-[0.18em]">
        Medication context unavailable
      </div>
      <p className="mt-2 text-[0.98rem] leading-7">{message}</p>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[0.9rem] bg-slate-200/70",
        className,
      )}
    />
  );
}

function ResultsLoadingState() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26.75rem] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_28.25rem]">
      <div className="space-y-5">
        <div className="surface-panel rounded-[1.55rem] p-5 sm:p-6">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-4 h-10 w-[min(24rem,72%)]" />
          <SkeletonBlock className="mt-3 h-4 w-full max-w-[34rem]" />
          <SkeletonBlock className="mt-2 h-4 w-full max-w-[28rem]" />
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>

          <div className="mt-5 rounded-[1.2rem] border border-slate-200/80 bg-white/82 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-4 w-36" />
                <SkeletonBlock className="mt-3 h-8 w-[min(15rem,78%)]" />
                <SkeletonBlock className="mt-2 h-4 w-full max-w-[16rem]" />
              </div>
              <SkeletonBlock className="h-10 w-16 rounded-full" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <SkeletonBlock className="h-9 w-24 rounded-full" />
              <SkeletonBlock className="h-9 w-28 rounded-full" />
              <SkeletonBlock className="h-9 w-32 rounded-full" />
            </div>
            <SkeletonBlock className="mt-4 h-4 w-full max-w-[24rem]" />
            <SkeletonBlock className="mt-2 h-4 w-full max-w-[18rem]" />
            <SkeletonBlock className="mt-4 h-20 w-full" />
            <div className="mt-4 flex flex-wrap gap-2">
              <SkeletonBlock className="h-10 w-36 rounded-full" />
              <SkeletonBlock className="h-10 w-28 rounded-full" />
            </div>
          </div>
        </div>

        <div className="surface-panel rounded-[1.55rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="mt-3 h-7 w-52" />
            </div>
            <SkeletonBlock className="h-5 w-24" />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <SkeletonBlock className="h-64" />
            <SkeletonBlock className="h-64" />
          </div>
        </div>
      </div>

      <div className="space-y-4 xl:sticky xl:top-[calc(var(--navbar-height)+1.25rem)]">
        <div className="surface-panel rounded-[1.45rem] p-4">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-3 h-7 w-44" />
          <SkeletonBlock className="mt-3 h-4 w-full" />
          <SkeletonBlock className="mt-2 h-4 w-[88%]" />
          <SkeletonBlock className="mt-4 h-20 w-full" />
        </div>
        <div className="surface-panel rounded-[1.45rem] p-4">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-3 h-8 w-48" />
          <div className="mt-4 grid grid-cols-4 gap-2">
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
          </div>
          <SkeletonBlock className="mt-4 h-40 w-full" />
        </div>
      </div>
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
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);

    Promise.allSettled([
      client.searchPharmacies({
        medication: query,
        location,
        locationPlaceId: locationPlaceId || undefined,
        radiusMiles,
        sortBy,
        onlyOpenNow,
      }, { signal: abortController.signal }),
      client.getDrugIntelligence(query, { signal: abortController.signal }),
    ]).then(([pharmacyResult, drugResult]) => {
      if (abortController.signal.aborted) {
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
      abortController.abort();
    };
  }, [query, location, locationPlaceId, radiusMiles, sortBy, onlyOpenNow]);

  useEffect(() => {
    if (!query) {
      setCrowdSignals({});
      return;
    }

    let cancelled = false;
    let unsubscribe: () => void = () => undefined;

    void import("@/lib/crowd-signal/firestore")
      .then(({ subscribeToCrowdReportsForMedication }) => {
        if (cancelled) {
          return;
        }

        unsubscribe = subscribeToCrowdReportsForMedication(query, (reports) => {
          setCrowdSignals(buildCrowdSignalMap(reports));
        });
      })
      .catch(() => {
        if (!cancelled) {
          setCrowdSignals({});
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
  const resolvedMedicationLabel =
    pharmacyData?.medication_profile.medication_label?.trim() ||
    featuredMatch?.demo_context?.selected_label?.trim() ||
    query;
  const resolvedMedicationStrength =
    pharmacyData?.medication_profile.selected_strength?.trim() ||
    featuredMatch?.demo_context?.selected_strength?.trim() ||
    "";

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
      <section className="px-4 pb-12 pt-[calc(var(--navbar-height)+1rem)] sm:px-6 lg:px-8 lg:pb-14 lg:pt-[calc(var(--navbar-height)+1.15rem)]">
        <div className="site-shell space-y-6 xl:space-y-7">
          <div className="max-w-[46rem]">
            <span className="eyebrow-label">Pharmacy Results</span>
            <h1 className="mt-4 max-w-[34rem] text-[2.18rem] leading-[0.98] tracking-tight text-balance text-slate-950 sm:text-[2.5rem] xl:text-[2.72rem]">
              Find nearby pharmacies to call first.
            </h1>
            <p className="mt-3 max-w-[40rem] text-[0.98rem] leading-7 text-slate-600 sm:text-[1.02rem]">
              {isDemoMedication
                ? "Refine the nearby list while keeping demo medication context clearly separate from live pharmacy results."
                : "Update the medication, strength, location, or filters here. Stock still needs a direct pharmacy call before pickup or transfer."}
            </p>
          </div>

          {!query || !location ? (
            <EmptyState
              eyebrow="Ready when you are"
              title="Enter a medication and location to build the nearby call list."
              body="PharmaPath combines live nearby pharmacy results with medication context without implying that any pharmacy has confirmed stock on the shelf."
            />
          ) : isLoading ? (
            <ResultsLoadingState />
          ) : (
            <>
              {isDemoMedication ? (
                <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50/85 px-4 py-3.5 text-sm leading-6 text-amber-950">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="eyebrow-label text-amber-700">
                      Demo medication
                    </span>
                    <span className="rounded-full border border-amber-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                      Simulated
                    </span>
                  </div>
                  <p className="mt-1.5">
                    {pharmacyData?.medication_profile.demo_note ||
                      featuredMatch?.demo_context?.note}
                  </p>
                  <p className="mt-1 text-amber-900/80">
                    {pharmacyData?.medication_profile.simulated_user_count ||
                      featuredMatch?.demo_context?.simulated_user_count ||
                      0}{" "}
                    seeded demo users are attached to this fictional medication
                    variant. Live pharmacy results stay separate from that demo
                    context.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26.75rem] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_28.25rem]">
                <div className="space-y-5">
                  <div className="surface-panel rounded-[1.55rem] p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-[38rem]">
                        <span className="eyebrow-label">Nearby call list</span>
                        <h2 className="mt-3 text-[1.6rem] tracking-tight text-balance text-slate-950 sm:text-[1.82rem]">
                          {pharmacyData?.location.display_label ||
                            pharmacyData?.location.formatted_address ||
                            location}
                        </h2>
                        {pharmacyData ? (
                          <p className="mt-2 text-[0.9rem] leading-6 text-slate-600">
                            {pharmacyData.guidance.ranking_focus}
                          </p>
                        ) : null}
                      </div>
                      {pharmacyData ? (
                        <div className="grid w-full grid-cols-3 gap-2.5 sm:w-auto sm:min-w-[18rem]">
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
                      <div className="mt-5 rounded-[1.2rem] border border-rose-200 bg-rose-50 p-4 text-rose-700">
                        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em]">
                          <AlertCircle className="h-4 w-4" />
                          Nearby lookup unavailable
                        </div>
                        <p className="mt-2 text-[0.96rem] leading-7">
                          {pharmacyError}
                        </p>
                      </div>
                    ) : pharmacyData?.degraded_reason ? (
                      <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-4 text-amber-800">
                        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em]">
                          <AlertCircle className="h-4 w-4" />
                          Live nearby search limited
                        </div>
                        <p className="mt-2 text-[0.96rem] leading-7">
                          {pharmacyData.degraded_reason}
                        </p>
                      </div>
                    ) : pharmacyData?.recommended ? (
                      <div className={`${recommendedPharmacyCardClass} mt-4 p-4 sm:p-5`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-[0.72rem] uppercase tracking-[0.18em] text-slate-500">
                              Recommended first call
                            </div>
                            <h3 className="mt-2 text-[1.32rem] tracking-tight text-slate-950 sm:text-[1.46rem]">
                              {pharmacyData.recommended.name}
                            </h3>
                            <p className="mt-1.5 text-sm leading-6 text-slate-600">
                              {pharmacyData.recommended.address}
                            </p>
                          </div>
                          <ResultDistanceChip
                            distanceMiles={pharmacyData.recommended.distance_miles}
                          />
                        </div>

                        <div className="mt-3">
                          <PharmacyAvailabilityMeta result={pharmacyData.recommended} />
                        </div>

                        <p className="mt-3 text-[0.92rem] leading-6 text-slate-700">
                          {pharmacyData.recommended.match_reason}
                        </p>

                        <div className="mt-3">
                          <CrowdSignalCard
                            medicationQuery={query}
                            medicationContext={pharmacyData?.medication_profile}
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
                            compact
                          />
                        </div>

                        <PharmacyActionRow pharmacy={pharmacyData.recommended} />
                      </div>
                    ) : (
                      <div className="mt-5 rounded-[1.2rem] border border-slate-200 bg-white p-4 text-slate-600">
                        {pharmacyData?.degraded_reason
                          ? "Live nearby pharmacy results are unavailable right now. Medication context is still available below."
                          : "No nearby pharmacies surfaced for this search. Try a broader location or a larger radius."}
                      </div>
                    )}
                  </div>

                  {visibleExtras.length ? (
                    <div className="surface-panel rounded-[1.55rem] p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="eyebrow-label">Other nearby options</span>
                          <h3 className="mt-3 text-[1.16rem] tracking-tight text-slate-950">
                            Other pharmacies to call next.
                          </h3>
                        </div>
                        {extraResults.length > 4 ? (
                          <button
                            type="button"
                            className="text-sm text-[#156d95]"
                            onClick={() => setShowAll((value) => !value)}
                          >
                            {showAll ? "Show fewer" : `Show ${extraResults.length - 4} more`}
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {visibleExtras.map((result, resultIndex) => (
                          <div
                            key={`${result.name}-${result.address}`}
                            className={`${standardPharmacyCardClass} p-4`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-[1.08rem] tracking-tight text-slate-900">
                                  {result.name}
                                </div>
                                <div className="mt-1 text-sm leading-5 text-slate-500">
                                  {result.address}
                                </div>
                              </div>
                              <ResultDistanceChip distanceMiles={result.distance_miles} />
                            </div>

                            <div className="mt-3">
                              <PharmacyAvailabilityMeta result={result} compact />
                            </div>

                            <p className="mt-2.5 text-[0.86rem] leading-5 text-slate-600">
                              {result.match_reason}
                            </p>

                            <div className="mt-3">
                              <CrowdSignalCard
                                medicationQuery={query}
                                medicationContext={pharmacyData?.medication_profile}
                                pharmacy={{
                                  name: result.name,
                                  address: result.address,
                                  placeId: result.place_id,
                                  googleMapsUrl: result.google_maps_url,
                                }}
                                summary={resolveCrowdSignalSummary(result, resultIndex + 1)}
                                compact
                              />
                            </div>

                            <PharmacyActionRow pharmacy={result} compact />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4 xl:sticky xl:top-[calc(var(--navbar-height)+1.25rem)]">
                  {pharmacyData ? (
                    <SearchGuidanceCard pharmacyData={pharmacyData} compact />
                  ) : null}

                  <PharmacySearchForm
                    initialMedication={resolvedMedicationLabel}
                    initialLocation={location}
                    initialLocationPlaceId={locationPlaceId || undefined}
                    initialRadiusMiles={radiusMiles}
                    initialSortBy={sortBy}
                    initialOnlyOpenNow={onlyOpenNow}
                    initialSelectedStrength={resolvedMedicationStrength}
                    compact
                    submitLabel="Refresh nearby search"
                  />

                  {drugError ? (
                    <MedicationContextError message={drugError} />
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {featuredMatch && !drugError ? (
        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="site-shell space-y-3.5">
            <div className="max-w-[44rem]">
              <span className="eyebrow-label">Medication context</span>
              <h3 className="mt-3 text-[1.24rem] tracking-tight text-slate-950">
                Medication context to keep nearby.
              </h3>
              <p className="mt-1.5 text-[0.92rem] leading-6 text-slate-600">
                Use this to support the next call, not to replace it.
              </p>
            </div>

            <div className="grid gap-3.5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
              <MedicationAccessSnapshotCard
                match={featuredMatch}
                dataFreshness={drugData!.data_freshness}
                variant="patient"
                selectedMedicationLabel={resolvedMedicationLabel}
                selectedStrength={resolvedMedicationStrength}
              />

              <MedicationLookupCard
                query={query}
                location={location}
                matchId={featuredMatch.id}
              />
            </div>

            <MedicationContextDetails
              match={featuredMatch}
              dataFreshness={drugData!.data_freshness}
              variant="patient"
              selectedMedicationLabel={resolvedMedicationLabel}
              selectedStrength={resolvedMedicationStrength}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
