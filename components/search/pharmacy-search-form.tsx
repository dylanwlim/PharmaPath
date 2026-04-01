"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LocationCombobox } from "@/components/search/location-combobox";
import { MedicationCombobox } from "@/components/search/medication-combobox";
import { MedicationStrengthField } from "@/components/search/medication-strength-field";
import { featuredSearches } from "@/lib/content";
import {
  createLocationSessionToken,
  resolveLocationQuery,
} from "@/lib/locations/client";
import {
  resolveMedicationOption,
  type MedicationSearchOption,
} from "@/lib/medications/client";
import { buildMedicationQueryLabel } from "@/lib/medications/selection";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

type PharmacySearchFormProps = {
  initialMedication?: string;
  initialLocation?: string;
  initialLocationPlaceId?: string;
  initialRadiusMiles?: number;
  initialSortBy?: "best_match" | "distance" | "rating";
  initialOnlyOpenNow?: boolean;
  action?: string;
  compact?: boolean;
  submitLabel?: string;
  showSamples?: boolean;
  className?: string;
};

function buildResultsHref({
  medication,
  location,
  locationPlaceId,
  radiusMiles,
  sortBy,
  onlyOpenNow,
  action = "/patient/results",
}: {
  medication: string;
  location: string;
  locationPlaceId?: string | null;
  radiusMiles: number;
  sortBy: string;
  onlyOpenNow: boolean;
  action?: string;
}) {
  const params = new URLSearchParams({
    query: medication.trim(),
    location: location.trim(),
    radiusMiles: String(radiusMiles),
    sortBy,
    onlyOpenNow: String(onlyOpenNow),
  });

  if (locationPlaceId) {
    params.set("locationPlaceId", locationPlaceId);
  }

  return `${action}?${params.toString()}`;
}

type LocationSelection = {
  label: string;
  placeId: string | null;
};

function createLocationSelection(label: string, placeId?: string | null) {
  const trimmedLabel = label.trim();

  if (!trimmedLabel) {
    return null;
  }

  return {
    label: trimmedLabel,
    placeId: placeId?.trim() || null,
  } satisfies LocationSelection;
}

export function PharmacySearchForm({
  initialMedication = "",
  initialLocation = "",
  initialLocationPlaceId = "",
  initialRadiusMiles = 5,
  initialSortBy = "best_match",
  initialOnlyOpenNow = false,
  action = "/patient/results",
  compact = false,
  submitLabel = "Search live nearby pharmacies",
  showSamples = false,
  className,
}: PharmacySearchFormProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [medicationOption, setMedicationOption] = useState<MedicationSearchOption | null>(null);
  const [medication, setMedication] = useState(initialMedication);
  const [selectedStrength, setSelectedStrength] = useState("");
  const [locationSelection, setLocationSelection] = useState<LocationSelection | null>(() =>
    createLocationSelection(initialLocation, initialLocationPlaceId),
  );
  const [location, setLocation] = useState(initialLocation);
  const [radiusMiles, setRadiusMiles] = useState(initialRadiusMiles);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [onlyOpenNow, setOnlyOpenNow] = useState(initialOnlyOpenNow);
  const [medicationError, setMedicationError] = useState<string | null>(null);
  const [strengthError, setStrengthError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isResolvingSearch, setIsResolvingSearch] = useState(false);
  const [locationSessionToken, setLocationSessionToken] = useState(createLocationSessionToken);

  useEffect(() => {
    let cancelled = false;

    setMedicationOption(null);
    setMedication(initialMedication);
    setSelectedStrength("");
    setMedicationError(null);
    setStrengthError(null);

    if (!initialMedication) {
      return () => {
        cancelled = true;
      };
    }

    void resolveMedicationOption(initialMedication)
      .then((option) => {
        if (cancelled || !option) {
          return;
        }

        setMedicationOption(option);
        setMedication(option.label);
        setSelectedStrength(option.matchedStrength || (option.strengths.length === 1 ? option.strengths[0].value : ""));
      })
      .catch(() => {
        if (!cancelled) {
          setMedication(initialMedication);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialMedication]);

  useEffect(() => {
    const nextLocationSelection = createLocationSelection(initialLocation, initialLocationPlaceId);
    setLocationSelection(nextLocationSelection);
    setLocation(nextLocationSelection?.label || initialLocation);
  }, [initialLocation, initialLocationPlaceId]);

  useEffect(() => {
    setRadiusMiles(initialRadiusMiles);
  }, [initialRadiusMiles]);

  useEffect(() => {
    setSortBy(initialSortBy);
  }, [initialSortBy]);

  useEffect(() => {
    setOnlyOpenNow(initialOnlyOpenNow);
  }, [initialOnlyOpenNow]);

  useEffect(() => {
    if (!initialLocation && !location && profile?.defaultLocationLabel) {
      const nextLocationSelection = createLocationSelection(profile.defaultLocationLabel);
      setLocationSelection(nextLocationSelection);
      setLocation(nextLocationSelection?.label || profile.defaultLocationLabel);
    }
  }, [initialLocation, location, profile?.defaultLocationLabel]);

  useEffect(() => {
    if (
      (!initialRadiusMiles || initialRadiusMiles === 5) &&
      radiusMiles === initialRadiusMiles &&
      profile?.preferredSearchRadius &&
      profile.preferredSearchRadius !== radiusMiles
    ) {
      setRadiusMiles(profile.preferredSearchRadius);
    }
  }, [initialRadiusMiles, profile?.preferredSearchRadius, radiusMiles]);

  const handleMedicationInputChange = (nextValue: string) => {
    setMedication(nextValue);
    setMedicationError(null);
    setStrengthError(null);

    if (
      medicationOption &&
      nextValue.trim().toLowerCase() !== medicationOption.label.trim().toLowerCase()
    ) {
      setMedicationOption(null);
      setSelectedStrength("");
    }
  };

  const handleLocationInputChange = (nextValue: string) => {
    setLocation(nextValue);
    setLocationError(null);

    if (
      locationSelection &&
      nextValue.trim().toLowerCase() !== locationSelection.label.trim().toLowerCase()
    ) {
      setLocationSelection(null);
    }
  };

  return (
    <div className={cn("surface-panel rounded-[2rem] p-5 sm:p-6 xl:p-7", className)}>
      <form
        className={cn("space-y-5", compact && "space-y-4")}
        onSubmit={async (event) => {
          event.preventDefault();
          setIsResolvingSearch(true);
          const normalizedMedication = medication.trim();
          const normalizedLocation = location.trim();

          if (!normalizedMedication || !normalizedLocation) {
            setMedicationError(normalizedMedication ? null : "Choose a medication from the search results.");
            setLocationError(
              normalizedLocation ? null : "Enter a city, ZIP, address, pharmacy, or landmark.",
            );
            setIsResolvingSearch(false);
            return;
          }

          const [medicationResult, locationResult] = await Promise.allSettled([
            medicationOption ? Promise.resolve(medicationOption) : resolveMedicationOption(normalizedMedication),
            resolveLocationQuery({
              query: normalizedLocation,
              placeId: locationSelection?.placeId,
              sessionToken: locationSessionToken,
            }),
          ]);

          try {
            const resolvedMedication =
              medicationResult.status === "fulfilled" ? medicationResult.value : null;
            const resolvedLocation =
              locationResult.status === "fulfilled" ? locationResult.value : null;
            const resolvedStrength =
              selectedStrength ||
              resolvedMedication?.matchedStrength ||
              (resolvedMedication?.strengths.length === 1 ? resolvedMedication.strengths[0].value : "");

            setMedicationError(
              medicationResult.status === "rejected"
                ? medicationResult.reason instanceof Error
                  ? medicationResult.reason.message
                  : "Unable to search medications right now."
                : resolvedMedication
                  ? null
                  : "Choose a medication from the search results.",
            );
            setStrengthError(
              resolvedMedication && resolvedMedication.strengths.length > 1 && !resolvedStrength
                ? "Choose a specific strength before searching."
                : null,
            );
            setLocationError(
              locationResult.status === "rejected"
                ? locationResult.reason instanceof Error
                  ? locationResult.reason.message
                  : "Unable to resolve that location right now."
                : resolvedLocation
                  ? null
                  : "Enter a real location to search nearby pharmacies.",
            );

            if (
              !resolvedMedication ||
              !resolvedLocation ||
              (resolvedMedication.strengths.length > 1 && !resolvedStrength)
            ) {
              return;
            }

            setMedicationOption(resolvedMedication);
            setMedication(resolvedMedication.label);
            setSelectedStrength(resolvedStrength);
            setLocationSelection(
              createLocationSelection(resolvedLocation.display_label, resolvedLocation.place_id),
            );
            setLocation(resolvedLocation.display_label);
            setLocationSessionToken(createLocationSessionToken());
            startTransition(() => {
              router.push(
                buildResultsHref({
                  medication: buildMedicationQueryLabel(resolvedMedication, resolvedStrength),
                  location: resolvedLocation.display_label,
                  locationPlaceId: resolvedLocation.place_id,
                  radiusMiles,
                  sortBy,
                  onlyOpenNow,
                  action,
                }),
              );
            });
          } finally {
            setIsResolvingSearch(false);
          }
        }}
      >
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 2xl:grid-cols-[minmax(0,1.45fr)_minmax(12rem,0.95fr)_minmax(0,1.15fr)]">
          <MedicationCombobox
            className="sm:col-span-2 2xl:col-span-1"
            label="Medication"
            placeholder="Search medication…"
            value={medication}
            selectedOptionId={medicationOption?.id || null}
            onValueChange={handleMedicationInputChange}
            onSelect={(option) => {
              setMedicationOption(option);
              setMedication(option.label);
              setSelectedStrength(
                option.matchedStrength || (option.strengths.length === 1 ? option.strengths[0].value : ""),
              );
              setMedicationError(null);
              setStrengthError(null);
            }}
            emptyMessage="No medication matches yet. Try a brand, generic, or strength."
            error={medicationError}
          />

          <MedicationStrengthField
            className="sm:col-span-1"
            option={medicationOption}
            value={selectedStrength}
            onChange={(nextValue) => {
              setSelectedStrength(nextValue);
              setStrengthError(null);
            }}
            error={strengthError}
            showWhenEmpty
          />

          <LocationCombobox
            className="sm:col-span-1"
            label="Location"
            placeholder="Search city or ZIP…"
            value={location}
            selectedPlaceId={locationSelection?.placeId || null}
            sessionToken={locationSessionToken}
            onValueChange={handleLocationInputChange}
            onSelect={(option) => {
              setLocationSelection(
                createLocationSelection(option.description, option.placeId),
              );
              setLocation(option.description);
              setLocationError(null);
            }}
            error={locationError}
          />
        </div>

        <div
          className={cn(
            "grid gap-x-4 gap-y-4 sm:grid-cols-2 2xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)_minmax(0,0.9fr)]",
          )}
        >
          <label className="search-field-stack">
            <span className="search-field-label">Radius</span>
            <select
              className="search-select-control"
              value={radiusMiles}
              onChange={(event) => setRadiusMiles(Number(event.target.value))}
            >
              <option value={2}>2 miles</option>
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={25}>25 miles</option>
            </select>
          </label>

          <label className="search-field-stack">
            <span className="search-field-label">Sort</span>
            <select
              className="search-select-control"
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as "best_match" | "distance" | "rating")
              }
            >
              <option value="best_match">Best overall match</option>
              <option value="distance">Closest first</option>
              <option value="rating">Highest rating</option>
            </select>
          </label>

          <label className="search-field-stack sm:col-span-2 2xl:col-span-1">
            <span className="search-field-label">Availability</span>
            <span className="search-toggle-control cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-[#156d95] focus:ring-[#156d95]"
                checked={onlyOpenNow}
                onChange={(event) => setOnlyOpenNow(event.target.checked)}
              />
              <span className="min-w-0">Open pharmacies only</span>
            </span>
          </label>
        </div>

        <div className="grid gap-4 pt-1 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="max-w-[42rem] text-sm leading-6 text-slate-600">
            Nearby pharmacies come from a live search. Stock still needs a direct call before pickup or transfer.
          </p>
          <button
            type="submit"
            disabled={isPending || isResolvingSearch}
            className="action-button-primary relative z-40 min-h-[3.75rem] whitespace-nowrap px-5 text-sm disabled:cursor-wait disabled:opacity-70 md:justify-self-end"
          >
            {isPending || isResolvingSearch ? "Loading…" : submitLabel}
          </button>
        </div>
      </form>

      {showSamples ? (
        <div className="mt-5 flex flex-wrap gap-2.5">
          {featuredSearches.map((search) => (
            <button
              key={search.id}
              type="button"
              className="flat-chip hover:border-[#156d95]/25 hover:text-[#156d95]"
              onClick={() =>
                startTransition(() => {
                  router.push(
                    buildResultsHref({
                      medication: search.medication,
                      location: search.location,
                      radiusMiles: 5,
                      sortBy: "best_match",
                      onlyOpenNow: false,
                      action,
                    }),
                  );
                })
              }
            >
              {search.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
