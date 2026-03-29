"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ExternalLink, LoaderCircle, MapPin, PhoneCall } from "lucide-react";
import {
  createPharmaPathClient,
  type DrugIntelligenceResponse,
  type PharmacySearchResponse,
} from "@/lib/pharmapath-client";
import { PharmacySearchForm } from "@/components/search/pharmacy-search-form";
import {
  CalloutList,
  EmptyState,
  MetricPill,
  formatDisplayDate,
  formatMiles,
} from "@/components/search/shared";

const client = createPharmaPathClient();

type Match = DrugIntelligenceResponse["matches"][number];
type ShortageItem = Match["evidence"]["shortages"]["items"][number];

/** Severity score 0–100 derived from supply + duration + volume */
function computeSeverityScore(items: ShortageItem[]): number {
  const active = items.filter((s) => (s.normalizedStatus ?? s.status?.toLowerCase()) === "active");
  const total = items.length;
  const available = items.filter((s) => {
    const ns = s.normalizedStatus ?? s.status?.toLowerCase() ?? "";
    return ns === "available" || ns === "producing";
  }).length;

  const supplyPenalty = total > 0 ? (1 - available / total) * 50 : 0;

  // Duration from earliest active updateDate
  const now = Date.now();
  const earliestMs = active
    .map((s) => s.updateDate ? new Date(s.updateDate).getTime() : null)
    .filter((t): t is number => t !== null && !isNaN(t))
    .sort((a, b) => a - b)[0];
  const daysSinceStart = earliestMs ? Math.floor((now - earliestMs) / 86_400_000) : 0;
  const durationPenalty = Math.min(daysSinceStart / 365, 1) * 30;

  const volumePenalty = Math.min(active.length, 5) * 4;
  return Math.min(Math.round(supplyPenalty + durationPenalty + volumePenalty), 100);
}

function severityMeta(score: number) {
  if (score <= 10) return { label: "No active shortage", color: "#22c55e", barClass: "bg-emerald-500", badgeClass: "bg-emerald-100 text-emerald-800" };
  if (score <= 30) return { label: "Mild shortage", color: "#eab308", barClass: "bg-yellow-400", badgeClass: "bg-yellow-100 text-yellow-800" };
  if (score <= 60) return { label: "Moderate shortage", color: "#f97316", barClass: "bg-orange-500", badgeClass: "bg-orange-100 text-orange-800" };
  return { label: "Severe shortage", color: "#ef4444", barClass: "bg-rose-500", badgeClass: "bg-rose-100 text-rose-800" };
}

function formatDuration(days: number): string {
  if (!days || days <= 0) return "N/A";
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""}`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  const years = days / 365;
  return `${years.toFixed(1)} yr${years >= 2 ? "s" : ""}`;
}

/** Group shortage items by extracted dose strength and count available vs total */
function buildDoseAvailability(items: ShortageItem[]) {
  const map = new Map<string, { available: number; total: number }>();
  for (const s of items) {
    const match = s.presentation?.match(/(\d+(?:\.\d+)?)\s*mg/i);
    const dose = match ? `${match[1]} mg` : (s.presentation ? s.presentation.slice(0, 30) : null);
    if (!dose) continue;
    const entry = map.get(dose) ?? { available: 0, total: 0 };
    entry.total += 1;
    const ns = s.normalizedStatus ?? s.status?.toLowerCase() ?? "";
    if (ns === "available" || ns === "producing") entry.available += 1;
    map.set(dose, entry);
  }
  return Array.from(map.entries())
    .map(([dose, counts]) => ({ dose, ...counts }))
    .sort((a, b) => b.available / (b.total || 1) - a.available / (a.total || 1));
}

const INSIGHT_ICON: Record<string, string> = {
  opportunity: "✓",
  timing: "◷",
  warning: "⚠",
  action: "→",
};

const INSIGHT_STYLE: Record<string, string> = {
  opportunity: "border-emerald-200 bg-emerald-50 text-emerald-900",
  timing: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-rose-200 bg-rose-50 text-rose-900",
  action: "border-violet-200 bg-violet-50 text-violet-900",
};

function ShortagePanel({
  match,
  drugData,
}: {
  match: Match;
  drugData: DrugIntelligenceResponse;
  query: string;
  location: string;
}) {
  const items = match.evidence.shortages.items;
  const activeShortages = items.filter(
    (s) => (s.normalizedStatus ?? s.status?.toLowerCase()) === "active",
  );
  const hasRecalls = match.evidence.recalls.recent_count > 0;

  const score = computeSeverityScore(items);
  const severity = severityMeta(score);
  const barWidth = Math.max(4, score);
  const doseAvailability = buildDoseAvailability(items);

  // Duration: days since earliest active shortage update
  const now = Date.now();
  const earliestActiveMs = activeShortages
    .map((s) => s.updateDate ? new Date(s.updateDate).getTime() : null)
    .filter((t): t is number => t !== null && !isNaN(t))
    .sort((a, b) => a - b)[0];
  const durationDays = earliestActiveMs ? Math.floor((now - earliestActiveMs) / 86_400_000) : 0;

  // Last FDA update label
  const lastUpdate = activeShortages.find((s) => s.updateLabel)?.updateLabel ?? "Unknown";

  // Top shortage reasons (deduplicated)
  const reasons = Array.from(
    new Set(activeShortages.map((s) => s.shortageReason).filter(Boolean))
  ).slice(0, 2) as string[];

  // Insights from what_may_make_it_harder — map to typed insight cards
  const insights = match.patient_view.what_may_make_it_harder.map((text) => {
    if (/discontinu/i.test(text)) return { type: "warning", text };
    if (/demand|quota|DEA/i.test(text)) return { type: "timing", text };
    if (/ask|call|request/i.test(text)) return { type: "action", text };
    if (/more than|higher|more active/i.test(text)) return { type: "opportunity", text };
    return { type: "warning", text };
  });

  return (
    <>
      {/* Header: severity bar + stats */}
      <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow-label">FDA Drug Shortage Intelligence</span>
            <h2 className="mt-4 text-2xl tracking-tight text-slate-950">{match.display_name}</h2>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${severity.badgeClass}`}>
            {severity.label}
          </span>
        </div>

        {/* Severity bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
            <span>Shortage severity</span>
            <span className="font-medium">{score}/100</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${severity.barClass}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-[1rem] border border-slate-100 bg-slate-50 p-3 text-center">
            <div className="text-lg font-semibold text-slate-900">{formatDuration(durationDays)}</div>
            <div className="mt-0.5 text-xs text-slate-500">Shortage duration</div>
          </div>
          <div className="rounded-[1rem] border border-slate-100 bg-slate-50 p-3 text-center">
            <div className="text-lg font-semibold text-slate-900">{lastUpdate}</div>
            <div className="mt-0.5 text-xs text-slate-500">Last FDA update</div>
          </div>
          <div className="rounded-[1rem] border border-slate-100 bg-slate-50 p-3 text-center">
            <div className="text-lg font-semibold text-slate-900 truncate">{reasons[0] ?? "Unknown"}</div>
            <div className="mt-0.5 text-xs text-slate-500">Cause</div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Shortages updated {formatDisplayDate(drugData.data_freshness.shortages_last_updated)} ·
          Recalls {formatDisplayDate(drugData.data_freshness.recalls_last_updated)}
        </p>
      </div>

      {/* Availability by dose */}
      {doseAvailability.length > 0 ? (
        <div className="surface-panel rounded-[2rem] p-6">
          <span className="eyebrow-label">Availability by dose</span>
          <div className="mt-5 space-y-3">
            {doseAvailability.map((d, i) => {
              const pct = d.total > 0 ? Math.round((d.available / d.total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-sm font-medium text-slate-700">{d.dose}</span>
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${pct > 50 ? "bg-emerald-500" : pct > 0 ? "bg-amber-400" : "bg-rose-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-slate-500">{d.available}/{d.total} producing</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Active shortage entries */}
      {activeShortages.length > 0 ? (
        <div className="surface-panel rounded-[2rem] p-6">
          <span className="eyebrow-label">Active shortage entries</span>
          <div className="mt-5 space-y-3">
            {activeShortages.slice(0, 5).map((s, i) => (
              <div key={i} className="rounded-[1.2rem] border border-rose-100 bg-rose-50 p-4">
                {s.presentation ? (
                  <div className="text-sm font-medium text-slate-900">{s.presentation}</div>
                ) : null}
                {s.companyName ? (
                  <div className="mt-1 text-sm text-slate-500">{s.companyName}</div>
                ) : null}
                {s.shortageReason ? (
                  <div className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">Reason:</span> {s.shortageReason}
                  </div>
                ) : null}
                {s.availability ? (
                  <div className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">Availability:</span> {s.availability}
                  </div>
                ) : null}
                {s.updateLabel ? (
                  <div className="mt-1 text-xs text-slate-400">Last updated {s.updateLabel}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="surface-panel rounded-[2rem] p-6">
          <span className="eyebrow-label">Shortage status</span>
          <p className="mt-4 text-base leading-7 text-slate-600">
            No active shortage entries found in the FDA database for this medication.
          </p>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 ? (
        <div className="surface-panel rounded-[2rem] p-6">
          <span className="eyebrow-label">What this means for you</span>
          <div className="mt-5 space-y-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`flex gap-3 rounded-[1.2rem] border p-4 text-sm leading-6 ${INSIGHT_STYLE[insight.type] ?? INSIGHT_STYLE.warning}`}
              >
                <span className="mt-0.5 shrink-0 text-base font-bold" aria-hidden>
                  {INSIGHT_ICON[insight.type] ?? "•"}
                </span>
                <p>{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Questions to ask */}
      <div className="surface-panel rounded-[2rem] p-6">
        <span className="eyebrow-label">Questions to ask your pharmacist</span>
        <CalloutList className="mt-5" items={match.patient_view.questions_to_ask} />
      </div>

      {/* Recent recalls */}
      {hasRecalls ? (
        <div className="surface-panel rounded-[2rem] p-6">
          <span className="eyebrow-label">Recent recall activity</span>
          <div className="mt-5 space-y-3">
            {match.evidence.recalls.items.slice(0, 3).map((r, i) => (
              <div key={i} className="rounded-[1.2rem] border border-amber-100 bg-amber-50 p-4">
                {r.productDescription ? (
                  <div className="text-sm font-medium text-slate-900">{r.productDescription}</div>
                ) : null}
                {r.recallingFirm ? (
                  <div className="mt-1 text-sm text-slate-500">{r.recallingFirm}</div>
                ) : null}
                {r.reason ? (
                  <div className="mt-1 text-sm text-slate-600">{r.reason}</div>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {r.classification ? (
                    <span className="rounded bg-amber-200 px-1.5 py-0.5 font-medium">Class {r.classification}</span>
                  ) : null}
                  {r.reportDateLabel ? <span>{r.reportDateLabel}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-xs leading-6 text-slate-500">
        Data from <strong>FDA openFDA Drug Shortages &amp; Enforcement APIs</strong>. Updated daily.
        Informational only — confirm availability with your pharmacist or prescriber.
      </div>
    </>
  );
}

export function PatientResultsClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.trim() || "";
  const location = searchParams.get("location")?.trim() || "";
  const radiusMiles = Number(searchParams.get("radiusMiles") || 5);
  const sortBy = (searchParams.get("sortBy") || "best_match") as "best_match" | "distance" | "rating";
  const onlyOpenNow = searchParams.get("onlyOpenNow") === "true";

  const [pharmacyData, setPharmacyData] = useState<PharmacySearchResponse | null>(null);
  const [drugData, setDrugData] = useState<DrugIntelligenceResponse | null>(null);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [drugError, setDrugError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const featuredMatch = useMemo(() => {
    if (!drugData?.matches?.length) {
      return null;
    }

    return drugData.matches[0];
  }, [drugData]);

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
        setPharmacyError(pharmacyResult.reason?.message || "Unable to load nearby pharmacies.");
      }

      if (drugResult.status === "fulfilled") {
        setDrugData(drugResult.value);
        setDrugError(null);
      } else {
        setDrugData(null);
        setDrugError(drugResult.reason?.message || "Unable to load medication intelligence.");
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [query, location, radiusMiles, sortBy, onlyOpenNow]);

  const extraResults = pharmacyData?.results.slice(1) || [];
  const visibleExtras = showAll ? extraResults : extraResults.slice(0, 4);

  return (
    <>
      <section className="px-4 pb-10 pt-28 sm:px-6 lg:px-8">
        <div className="site-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <span className="eyebrow-label">Patient results</span>
            <h1 className="mt-6 text-[2.9rem] leading-tight tracking-tight text-slate-950 sm:text-[3.4rem]">
              Nearby pharmacies on the left. Medication signal on the right.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              This page keeps the live nearby lookup and the FDA-derived medication signal together,
              while staying explicit that they answer different questions.
            </p>
          </div>

          <PharmacySearchForm
            initialMedication={query}
            initialLocation={location}
            initialRadiusMiles={radiusMiles}
            initialSortBy={sortBy}
            initialOnlyOpenNow={onlyOpenNow}
            compact
            submitLabel="Refresh nearby search"
          />
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="site-shell space-y-6">
          {!query || !location ? (
            <EmptyState
              eyebrow="Ready when you are"
              title="Enter both a medication and a location to load the live patient view."
              body="PharmaPath will combine a live nearby pharmacy lookup with FDA-based access context, without claiming any pharmacy has the medication confirmed on the shelf."
            />
          ) : isLoading ? (
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="surface-panel flex min-h-[28rem] items-center justify-center rounded-[2rem]">
                <div className="flex items-center gap-3 text-slate-500">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Loading nearby search and medication signal...
                </div>
              </div>
              <div className="surface-panel min-h-[28rem] rounded-[2rem] p-6" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="eyebrow-label">Live nearby pharmacies</span>
                      <h2 className="mt-4 text-2xl tracking-tight text-slate-950">
                        {pharmacyData?.location.formatted_address || location}
                      </h2>
                    </div>
                    {pharmacyData ? (
                      <div className="grid grid-cols-3 gap-3">
                        <MetricPill label="Results" value={String(pharmacyData.counts.total)} />
                        <MetricPill label="Open now" value={String(pharmacyData.counts.open_now)} />
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
                      <p className="mt-3 text-base leading-7">{pharmacyError}</p>
                    </div>
                  ) : pharmacyData?.recommended ? (
                    <div className="mt-6 space-y-5">
                      <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="text-sm uppercase tracking-[0.18em] text-slate-500">
                              Recommended first call
                            </div>
                            <h3 className="mt-2 text-2xl tracking-tight text-slate-950">
                              {pharmacyData.recommended.name}
                            </h3>
                            <p className="mt-2 text-base leading-7 text-slate-600">
                              {pharmacyData.recommended.address}
                            </p>
                          </div>
                          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {formatMiles(pharmacyData.recommended.distance_miles)}
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-600">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                            {pharmacyData.recommended.open_now === true
                              ? "Open now"
                              : pharmacyData.recommended.open_now === false
                                ? "Closed now"
                                : "Hours unavailable"}
                          </span>
                          {pharmacyData.recommended.rating ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                              Rating {pharmacyData.recommended.rating.toFixed(1)}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                            {pharmacyData.recommended.review_label}
                          </span>
                        </div>

                        <p className="mt-5 text-base leading-7 text-slate-700">
                          {pharmacyData.recommended.match_reason}
                        </p>

                        <div className="mt-5 rounded-[1.4rem] border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
                          <div className="font-medium">Suggested question</div>
                          <p className="mt-2">{pharmacyData.recommended.next_step}</p>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          {pharmacyData.recommended.google_maps_url ? (
                            <a
                              href={pharmacyData.recommended.google_maps_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex rounded-full bg-slate-950 px-[18px] py-[15px] text-sm font-medium leading-4 text-white transition-all duration-200 hover:rounded-2xl"
                            >
                              Open in Google Maps
                            </a>
                          ) : null}
                          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                            <PhoneCall className="h-4 w-4" />
                            Inventory still needs a direct call.
                          </div>
                        </div>
                      </div>

                      {visibleExtras.length ? (
                        <div className="surface-panel rounded-[1.8rem] p-5">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-xl tracking-tight text-slate-950">Other nearby options</h3>
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
                          <div className="mt-4 space-y-3">
                            {visibleExtras.map((result) => (
                              <div
                                key={`${result.name}-${result.address}`}
                                className="rounded-[1.4rem] border border-slate-200 bg-white p-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="text-lg tracking-tight text-slate-900">{result.name}</div>
                                    <div className="mt-1 text-sm text-slate-500">{result.address}</div>
                                  </div>
                                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                    {formatMiles(result.distance_miles)}
                                  </div>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-slate-600">{result.match_reason}</p>
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
                        <p className="mt-2">{pharmacyData.guidance.demo_boundary}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 text-slate-600">
                      No nearby pharmacy results surfaced for this search. Try a broader location or
                      a larger radius.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {drugError ? (
                  <div className="surface-panel rounded-[2rem] border-rose-200 bg-rose-50 p-6 text-rose-700">
                    <div className="text-sm font-medium uppercase tracking-[0.18em]">
                      Shortage data unavailable
                    </div>
                    <p className="mt-3 text-base leading-7">{drugError}</p>
                  </div>
                ) : featuredMatch ? (
                  <ShortagePanel match={featuredMatch} drugData={drugData!} query={query} location={location} />
                ) : (
                  <EmptyState
                    eyebrow="No FDA match"
                    title={`No shortage data found for "${query}".`}
                    body="No active shortage records matched this medication in the FDA database. Try simplifying the medication name."
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
