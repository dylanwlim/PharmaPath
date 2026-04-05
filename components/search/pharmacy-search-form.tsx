"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, MapPin, Pill, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { LocationCombobox } from "@/components/search/location-combobox";
import { MedicationCombobox } from "@/components/search/medication-combobox";
import { featuredSearches } from "@/lib/content";
import { motionEase, motionTiming } from "@/lib/motion";
import {
  canFallbackToDirectLocationSearch,
  createLocationSessionToken,
  resolveLocationQuery,
} from "@/lib/locations/client";
import {
  getCachedMedicationSelection,
  resolveMedicationOption,
  type MedicationSearchOption,
} from "@/lib/medications/client";
import {
  buildMedicationQueryLabel,
  inferMatchedStrength,
} from "@/lib/medications/selection";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

type PharmacySearchFormProps = {
  initialMedication?: string;
  initialLocation?: string;
  initialLocationPlaceId?: string;
  initialRadiusMiles?: number;
  initialSortBy?: "best_match" | "distance" | "rating";
  initialOnlyOpenNow?: boolean;
  initialSelectedStrength?: string;
  action?: string;
  compact?: boolean;
  submitLabel?: string;
  showSamples?: boolean;
  className?: string;
};

type SearchStep = "medication" | "strength" | "location" | "review";

type LocationSelection = {
  label: string;
  placeId: string | null;
};

const guidedSteps: Array<{
  id: SearchStep;
  label: string;
  helper?: string;
}> = [
  { id: "medication", label: "Medication" },
  { id: "strength", label: "Strength", helper: "If needed" },
  { id: "location", label: "Location" },
  { id: "review", label: "Filters" },
];

function buildResultsHref({
  medication,
  location,
  locationPlaceId,
  radiusMiles,
  sortBy,
  onlyOpenNow,
  action = "/pharmacy-finder/results",
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

function getStepIndex(step: SearchStep) {
  return guidedSteps.findIndex((item) => item.id === step);
}

function resolveInitialStep({
  medication,
  location,
  selectedStrength,
}: {
  medication: string;
  location: string;
  selectedStrength: string;
}) {
  if (!medication.trim()) {
    return "medication" satisfies SearchStep;
  }

  if (!location.trim()) {
    return selectedStrength.trim()
      ? ("location" satisfies SearchStep)
      : ("location" satisfies SearchStep);
  }

  return selectedStrength.trim()
    ? ("review" satisfies SearchStep)
    : ("location" satisfies SearchStep);
}

function needsStrengthSelection(
  option: MedicationSearchOption | null,
  selectedStrength: string,
) {
  return Boolean(option && option.strengths.length > 1 && !selectedStrength.trim());
}

function resolveStepAfterMedication({
  option,
  selectedStrength,
  location,
}: {
  option: MedicationSearchOption;
  selectedStrength: string;
  location: string;
}) {
  if (needsStrengthSelection(option, selectedStrength)) {
    return "strength" satisfies SearchStep;
  }

  return location.trim()
    ? ("review" satisfies SearchStep)
    : ("location" satisfies SearchStep);
}

function resolvePreviousStep(step: SearchStep, hasStrengthStep: boolean) {
  if (step === "strength") {
    return "medication" satisfies SearchStep;
  }

  if (step === "location") {
    return hasStrengthStep
      ? ("strength" satisfies SearchStep)
      : ("medication" satisfies SearchStep);
  }

  if (step === "review") {
    return "location" satisfies SearchStep;
  }

  return "medication" satisfies SearchStep;
}

function getFormHeading(compact: boolean) {
  return compact
    ? "Update the search, then refresh the call list."
    : "Search by medication, then narrow the details.";
}

function getFormDescription(compact: boolean) {
  return compact
    ? "Change the medication, strength, or location first. Use filters only when you need to widen or reorder nearby options."
    : "Choose the medication first. If there are multiple strengths, we’ll ask for the one you need before you set the search area.";
}

function getStepCopy(step: SearchStep, compact: boolean) {
  if (step === "medication") {
    return {
      eyebrow: "Medication",
      title: "Search for your medication.",
      description:
        "Choose the best match so the nearby search stays precise from the start.",
    };
  }

  if (step === "strength") {
    return {
      eyebrow: "Strength",
      title: "Choose the strength you need.",
      description:
        "We only stop here when this medication can map to more than one usable strength.",
    };
  }

  if (step === "location") {
    return {
      eyebrow: "Location",
      title: "Enter where to search nearby.",
      description:
        "Use a city, ZIP code, or address. Pick a live suggestion if it looks right, or keep the typed text for direct resolution when you search.",
    };
  }

  return {
    eyebrow: compact ? "Refresh nearby search" : "Search options",
    title: compact
      ? "Adjust search options, then refresh the call list."
      : "Adjust search options, then see nearby pharmacies worth calling.",
    description:
      "Use radius, sort, and open-now only when you want to reshape the shortlist.",
  };
}

function getStrengthStepHelper({
  medicationOption,
  showStrengthStep,
  selectedStrength,
}: {
  medicationOption: MedicationSearchOption | null;
  showStrengthStep: boolean;
  selectedStrength: string;
}) {
  if (!medicationOption) {
    return "If needed";
  }

  if (showStrengthStep) {
    return selectedStrength.trim() ? "Chosen" : "If needed";
  }

  return selectedStrength.trim() ? "Matched" : "Not needed";
}

function FocusStepIndicator({
  activeStep,
  showStrengthStep,
  medicationOption,
  selectedStrength,
}: {
  activeStep: SearchStep;
  showStrengthStep: boolean;
  medicationOption: MedicationSearchOption | null;
  selectedStrength: string;
}) {
  const activeIndex = getStepIndex(activeStep);

  return (
    <ol className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {guidedSteps.map((item, index) => {
        const isOptionalStrength = item.id === "strength" && !showStrengthStep;
        const state =
          index < activeIndex || (isOptionalStrength && activeIndex > index)
            ? "complete"
            : index === activeIndex
              ? "active"
              : "upcoming";

        return (
          <li
            key={item.id}
            className={cn(
              "flex min-w-0 items-start gap-2.5 rounded-[1.15rem] border px-3.5 py-3 text-left transition-colors lg:min-h-[4.25rem]",
              state === "active" &&
                "border-[#156d95]/24 bg-[#156d95]/8 text-[#0f5d7d]",
              state === "complete" &&
                "border-slate-200 bg-white text-slate-700",
              state === "upcoming" &&
                "border-transparent bg-slate-100/80 text-slate-500",
            )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.68rem] font-semibold",
                  state === "active" &&
                    "border-[#156d95]/26 bg-white text-[#0f5d7d]",
                  state === "complete" && "border-slate-200 bg-white text-slate-700",
                  state === "upcoming" &&
                    "border-slate-200/80 bg-white/70 text-slate-400",
                )}
              >
                {state === "complete" ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.15em]">
                  {item.label}
                </span>
                {item.helper ? (
                  <span className="mt-1 block text-[0.63rem] uppercase tracking-[0.14em] text-current/65">
                    {getStrengthStepHelper({
                      medicationOption,
                      showStrengthStep,
                      selectedStrength,
                    })}
                  </span>
                ) : null}
              </span>
          </li>
        );
      })}
    </ol>
  );
}

function SelectionSummaryChip({
  label,
  value,
  placeholder,
  icon,
  state,
  onClick,
  className,
}: {
  label: string;
  value?: string | null;
  placeholder: string;
  icon: ReactNode;
  state: "complete" | "active" | "pending";
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          state === "active" && "bg-[#156d95]/12 text-[#156d95]",
          state === "complete" && "bg-slate-100 text-slate-600",
          state === "pending" && "bg-slate-100/80 text-slate-400",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.64rem] uppercase tracking-[0.16em] text-slate-400">
          {label}
        </span>
        <span
          className={cn(
            "mt-1 block line-clamp-2 text-[0.95rem] leading-5 font-semibold",
            value ? "text-slate-900" : "text-slate-500",
          )}
          title={value || placeholder}
        >
          {value || placeholder}
        </span>
      </span>
      {state === "complete" && onClick ? (
        <span className="shrink-0 self-start text-[0.72rem] font-medium text-[#156d95]">
          Edit
        </span>
      ) : state === "active" ? (
        <span className="shrink-0 self-start text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[#156d95]">
          Current
        </span>
      ) : null}
    </>
  );

  if (!onClick) {
    return (
      <div
        className={cn(
          "flex min-w-0 items-start gap-3 rounded-[1.1rem] border px-4 py-3 text-left shadow-[0_1px_1px_rgba(15,23,42,0.04)]",
          state === "active" &&
            "border-[#156d95]/22 bg-[#156d95]/8",
          state === "complete" && "border-slate-200/90 bg-white/92",
          state === "pending" && "border-slate-200 bg-slate-50/92 text-slate-500",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-[1.1rem] border px-4 py-3 text-left shadow-[0_1px_1px_rgba(15,23,42,0.04)] transition-[border-color,background-color,transform] duration-150 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#156d95]/10",
        state === "active" &&
          "border-[#156d95]/22 bg-[#156d95]/8",
        state === "complete" &&
          "border-slate-200/90 bg-white/92 hover:border-[#156d95]/22 hover:bg-white",
        state === "pending" &&
          "border-slate-200 bg-slate-50/92 hover:border-slate-300",
        className,
      )}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

function focusElementWithoutScroll(target: HTMLElement | null) {
  if (!target) {
    return;
  }

  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
}

export function PharmacySearchForm({
  initialMedication = "",
  initialLocation = "",
  initialLocationPlaceId = "",
  initialRadiusMiles = 5,
  initialSortBy = "best_match",
  initialOnlyOpenNow = false,
  initialSelectedStrength = "",
  action = "/pharmacy-finder/results",
  compact = false,
  submitLabel = "Find nearby pharmacies",
  showSamples = false,
  className,
}: PharmacySearchFormProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { profile } = useAuth();
  const [isPending, startTransition] = useTransition();
  const medicationInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const stepCardRef = useRef<HTMLDivElement>(null);
  const strengthButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusTargetRef = useRef<SearchStep | "submit">(
    resolveInitialStep({
      medication: initialMedication,
      location: initialLocation,
      selectedStrength: initialSelectedStrength,
    }),
  );
  const hasMountedRef = useRef(false);
  const shouldAutoAlignRef = useRef(false);
  const [transitionDirection, setTransitionDirection] = useState(1);
  const [activeStep, setActiveStep] = useState<SearchStep>(() =>
    resolveInitialStep({
      medication: initialMedication,
      location: initialLocation,
      selectedStrength: initialSelectedStrength,
    }),
  );
  const [medicationOption, setMedicationOption] =
    useState<MedicationSearchOption | null>(null);
  const [medication, setMedication] = useState(initialMedication);
  const [selectedStrength, setSelectedStrength] = useState(
    initialSelectedStrength.trim(),
  );
  const [locationSelection, setLocationSelection] =
    useState<LocationSelection | null>(() =>
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
  const [isApplyingSampleId, setIsApplyingSampleId] = useState<string | null>(
    null,
  );
  const [locationSessionToken, setLocationSessionToken] = useState(
    createLocationSessionToken,
  );
  const showsStrengthCheckpoint = Boolean(
    medicationOption && medicationOption.strengths.length > 1,
  );
  const medicationSupportText =
    medicationOption?.demoOnly
      ? `Simulated demo medication · ${
          medicationOption.simulatedUserCount || 0
        } seeded demo users`
      : Array.from(
          new Set(
            [
              medicationOption?.formulation,
              medicationOption?.dosageForm,
            ].filter(Boolean),
          ),
        ).join(" · ") || null;
  const summaryMedication =
    medicationOption?.label || medication.trim() || "Search for a medication";
  const summaryStrength = selectedStrength.trim();
  const summaryLocation =
    locationSelection?.label || location.trim() || "Add a location";
  const stepCopy = getStepCopy(activeStep, compact);

  useEffect(() => {
    let cancelled = false;
    const resolvedInitialStrength = initialSelectedStrength.trim();
    const cachedSelection = getCachedMedicationSelection(
      initialMedication,
      resolvedInitialStrength,
    );
    const nextStrength =
      resolvedInitialStrength || cachedSelection?.matchedStrength || "";

    setMedicationOption(cachedSelection);
    setMedication(cachedSelection?.label || initialMedication);
    setSelectedStrength(nextStrength);
    setMedicationError(null);
    setStrengthError(null);
    setActiveStep(
      resolveInitialStep({
        medication: cachedSelection?.label || initialMedication,
        location: initialLocation,
        selectedStrength: nextStrength,
      }),
    );

    if (!initialMedication || cachedSelection) {
      return () => {
        cancelled = true;
      };
    }

    void resolveMedicationOption(initialMedication)
      .then((option) => {
        if (cancelled || !option) {
          return;
        }

        const resolvedStrength =
          resolvedInitialStrength ||
          option.matchedStrength ||
          inferMatchedStrength(initialMedication, option.strengths) ||
          (option.strengths.length === 1 ? option.strengths[0].value : "");

        setMedicationOption(option);
        setMedication(option.label);
        setSelectedStrength(resolvedStrength);
        setActiveStep(
          resolveStepAfterMedication({
            option,
            selectedStrength: resolvedStrength,
            location: initialLocation,
          }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMedication(initialMedication);
          setSelectedStrength(resolvedInitialStrength);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialMedication, initialSelectedStrength, initialLocation]);

  useEffect(() => {
    const nextLocationSelection = createLocationSelection(
      initialLocation,
      initialLocationPlaceId,
    );
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
      const nextLocationSelection = createLocationSelection(
        profile.defaultLocationLabel,
      );
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

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const focusTarget = focusTargetRef.current;
    if (!focusTarget) {
      return;
    }

    const focusDelayMs = reduceMotion
      ? 0
      : Math.round(
          (compact ? motionTiming.base * 0.76 : motionTiming.base * 0.84) *
            1000 +
            48,
        );
    const timeoutId = window.setTimeout(() => {
      if (focusTarget === "medication") {
        focusElementWithoutScroll(medicationInputRef.current);
        return;
      }

      if (focusTarget === "location") {
        focusElementWithoutScroll(locationInputRef.current);
        return;
      }

      if (focusTarget === "submit") {
        focusElementWithoutScroll(submitButtonRef.current);
        return;
      }

      if (focusTarget === "strength") {
        const activeIndex = medicationOption?.strengths.findIndex(
          (strength) => strength.value === selectedStrength,
        );
        const targetIndex = activeIndex && activeIndex >= 0 ? activeIndex : 0;
        focusElementWithoutScroll(strengthButtonRefs.current[targetIndex]);
      }
    }, focusDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeStep,
    compact,
    medicationOption?.id,
    medicationOption?.strengths,
    reduceMotion,
    selectedStrength,
  ]);

  useEffect(() => {
    if (!shouldAutoAlignRef.current) {
      return;
    }

    shouldAutoAlignRef.current = false;
    const card = stepCardRef.current;
    if (!card) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const targetTop = window.innerWidth >= 1024 ? 108 : 92;
      const lowerBound = Math.max(targetTop + 12, window.innerHeight * 0.24);

      if (rect.top >= targetTop && rect.top <= lowerBound) {
        return;
      }

      window.scrollBy({
        top: rect.top - targetTop,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeStep, reduceMotion]);

  const goToStep = (
    nextStep: SearchStep,
    focusTarget: SearchStep | "submit" = nextStep,
  ) => {
    focusTargetRef.current = focusTarget;
    shouldAutoAlignRef.current = true;

    if (nextStep === activeStep) {
      window.requestAnimationFrame(() => {
        if (focusTarget === "medication") {
          focusElementWithoutScroll(medicationInputRef.current);
        } else if (focusTarget === "location") {
          focusElementWithoutScroll(locationInputRef.current);
        } else if (focusTarget === "submit") {
          focusElementWithoutScroll(submitButtonRef.current);
        }

        const card = stepCardRef.current;
        if (!card) {
          return;
        }

        const rect = card.getBoundingClientRect();
        const targetTop = window.innerWidth >= 1024 ? 108 : 92;
        if (rect.top < targetTop) {
          window.scrollBy({
            top: rect.top - targetTop,
            behavior: reduceMotion ? "auto" : "smooth",
          });
        }
      });
      return;
    }

    setTransitionDirection(
      getStepIndex(nextStep) >= getStepIndex(activeStep) ? 1 : -1,
    );
    setActiveStep(nextStep);
  };

  const handleMedicationInputChange = (nextValue: string) => {
    setMedication(nextValue);
    setMedicationError(null);
    setStrengthError(null);

    if (
      medicationOption &&
      nextValue.trim().toLowerCase() !==
        medicationOption.label.trim().toLowerCase()
    ) {
      setMedicationOption(null);
      setSelectedStrength("");
      return;
    }

    if (
      !medicationOption &&
      selectedStrength &&
      nextValue.trim().toLowerCase() !== medication.trim().toLowerCase()
    ) {
      setSelectedStrength("");
    }
  };

  const handleLocationInputChange = (nextValue: string) => {
    setLocation(nextValue);
    setLocationError(null);

    if (
      locationSelection &&
      nextValue.trim().toLowerCase() !==
        locationSelection.label.trim().toLowerCase()
    ) {
      setLocationSelection(null);
    }
  };

  const handleMedicationSelection = (option: MedicationSearchOption) => {
    const nextStrength =
      option.matchedStrength ||
      (option.strengths.length === 1 ? option.strengths[0].value : "");
    const nextStep = resolveStepAfterMedication({
      option,
      selectedStrength: nextStrength,
      location,
    });

    setMedicationOption(option);
    setMedication(option.label);
    setSelectedStrength(nextStrength);
    setMedicationError(null);
    setStrengthError(null);
    goToStep(nextStep, nextStep === "review" ? "submit" : nextStep);
  };

  const handleStrengthSelection = (nextStrength: string) => {
    setSelectedStrength(nextStrength);
    setStrengthError(null);
    goToStep(location.trim() ? "review" : "location", location.trim() ? "submit" : "location");
  };

  const handleLocationContinue = () => {
    if (!location.trim()) {
      setLocationError("Enter a city, ZIP, address, pharmacy, or landmark.");
      return;
    }

    setLocationError(null);
    goToStep("review", "submit");
  };

  const handleFeaturedSearch = async (search: (typeof featuredSearches)[number]) => {
    setIsApplyingSampleId(search.id);
    setMedicationError(null);
    setStrengthError(null);
    setLocationError(null);
    setRadiusMiles(5);
    setSortBy("best_match");
    setOnlyOpenNow(false);

    try {
      const resolvedOption =
        getCachedMedicationSelection(search.medication) ||
        (await resolveMedicationOption(search.medication));
      const resolvedStrength =
        resolvedOption?.matchedStrength ||
        inferMatchedStrength(search.medication, resolvedOption?.strengths || []) ||
        (resolvedOption?.strengths.length === 1
          ? resolvedOption.strengths[0].value
          : "");
      const nextLocationSelection = createLocationSelection(search.location);

      setMedicationOption(resolvedOption);
      setMedication(resolvedOption?.label || search.medication);
      setSelectedStrength(resolvedStrength);
      setLocationSelection(nextLocationSelection);
      setLocation(nextLocationSelection?.label || search.location);
      setLocationSessionToken(createLocationSessionToken());

      if (resolvedOption) {
        const nextStep = resolveStepAfterMedication({
          option: resolvedOption,
          selectedStrength: resolvedStrength,
          location: search.location,
        });
        goToStep(
          nextStep,
          nextStep === "review" ? "submit" : nextStep,
        );
      } else {
        goToStep("medication", "medication");
      }
    } finally {
      setIsApplyingSampleId(null);
    }
  };

  const stepMotion = {
    initial: (direction: number) =>
      reduceMotion
        ? { opacity: 1, x: 0 }
        : { opacity: 0, x: direction > 0 ? 28 : -28 },
    animate: { opacity: 1, x: 0 },
    exit: (direction: number) =>
      reduceMotion
        ? { opacity: 1, x: 0 }
        : { opacity: 0, x: direction > 0 ? -24 : 24 },
  };
  const stepTransition = reduceMotion
    ? { duration: 0 }
    : {
        duration: compact ? motionTiming.base * 0.76 : motionTiming.base * 0.84,
        ease: motionEase.reveal,
      };
  const selectionSummaryItems = activeStep === "medication"
    ? []
    : [
    medication.trim()
      ? {
          key: "medication",
          label: "Medication",
          value: medication.trim() ? summaryMedication : null,
          placeholder: "Choose a medication",
          icon: <Pill className="h-4 w-4" />,
          state: "complete",
          onClick: () => goToStep("medication", "medication"),
        }
      : null,
    showsStrengthCheckpoint || summaryStrength || activeStep === "strength"
      ? {
          key: "strength",
          label: "Strength",
          value: summaryStrength || null,
          placeholder: "Choose strength",
          icon: <Settings2 className="h-4 w-4" />,
          state: activeStep === "strength"
            ? "active"
            : summaryStrength
              ? "complete"
              : "pending",
          onClick:
            activeStep === "strength" || !summaryStrength
              ? undefined
              : () => goToStep("strength", "strength"),
        }
      : null,
    {
      key: "location",
      label: "Location",
      value: location.trim() ? summaryLocation : null,
      placeholder: "Choose a location",
      icon: <MapPin className="h-4 w-4" />,
      state: activeStep === "location"
        ? "active"
        : location.trim()
          ? "complete"
          : "pending",
      onClick:
        activeStep === "location" || !location.trim()
          ? undefined
          : () => goToStep("location", "location"),
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string | null;
    placeholder: string;
    icon: ReactNode;
    state: "complete" | "active" | "pending";
    onClick?: () => void;
  }>;

  return (
    <div
      className={cn(
        "surface-panel rounded-[1.95rem] p-5 sm:p-6 xl:p-7",
        compact && "rounded-[1.65rem] p-3.5 sm:p-4 xl:p-5",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-[1.7rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,251,254,0.92))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:p-6 xl:p-7",
          compact && "rounded-[1.35rem] p-3.5 sm:p-4 xl:p-5",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-[40rem]">
            <span className="eyebrow-label">
              {compact ? "Refine nearby search" : "Nearby pharmacy search"}
            </span>
            <h2
              className={cn(
                "mt-2.5 tracking-tight text-slate-950",
                compact ? "text-[1.22rem]" : "text-[1.62rem] sm:text-[1.78rem]",
              )}
            >
              {getFormHeading(compact)}
            </h2>
            <p
              className={cn(
                "mt-2 max-w-[40rem] text-slate-600",
                compact ? "text-[0.88rem] leading-6" : "text-[0.93rem] leading-6",
              )}
            >
              {getFormDescription(compact)}
            </p>
          </div>

          <div className="rounded-full border border-white/80 bg-white/82 px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.18em] text-slate-500 shadow-[0_1px_1px_rgba(15,23,42,0.04)]">
            Step {getStepIndex(activeStep) + 1} of {guidedSteps.length}
          </div>
        </div>

        <FocusStepIndicator
          activeStep={activeStep}
          showStrengthStep={showsStrengthCheckpoint}
          medicationOption={medicationOption}
          selectedStrength={selectedStrength}
        />

        <form
          className="mt-3.5"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsResolvingSearch(true);
            const normalizedMedication = medication.trim();
            const normalizedLocation = location.trim();

            if (!normalizedMedication || !normalizedLocation) {
              setMedicationError(
                normalizedMedication
                  ? null
                  : "Choose a medication from the search results.",
              );
              setLocationError(
                normalizedLocation
                  ? null
                  : "Enter a city, ZIP, address, pharmacy, or landmark.",
              );
              goToStep(
                normalizedMedication ? "location" : "medication",
                normalizedMedication ? "location" : "medication",
              );
              setIsResolvingSearch(false);
              return;
            }

            const [medicationResult, locationResult] = await Promise.allSettled([
              medicationOption
                ? Promise.resolve(medicationOption)
                : resolveMedicationOption(normalizedMedication),
              resolveLocationQuery({
                query: normalizedLocation,
                placeId: locationSelection?.placeId,
                sessionToken: locationSessionToken,
              }),
            ]);

            try {
              const resolvedMedication =
                medicationResult.status === "fulfilled"
                  ? medicationResult.value
                  : null;
              const resolvedLocation =
                locationResult.status === "fulfilled" ? locationResult.value : null;
              const canUseDirectLocationFallback =
                locationResult.status === "rejected" &&
                canFallbackToDirectLocationSearch(locationResult.reason);
              const resolvedStrength =
                selectedStrength ||
                resolvedMedication?.matchedStrength ||
                inferMatchedStrength(
                  normalizedMedication,
                  resolvedMedication?.strengths || [],
                ) ||
                (resolvedMedication?.strengths.length === 1
                  ? resolvedMedication.strengths[0].value
                  : "");

              const nextMedicationError =
                medicationResult.status === "rejected"
                  ? medicationResult.reason instanceof Error
                    ? medicationResult.reason.message
                    : "Unable to search medications right now."
                  : resolvedMedication
                    ? null
                    : "Choose a medication from the search results.";
              const nextStrengthError =
                resolvedMedication &&
                resolvedMedication.strengths.length > 1 &&
                !resolvedStrength
                  ? "Choose a specific strength before searching."
                  : null;
              const nextLocationError = canUseDirectLocationFallback
                ? null
                : locationResult.status === "rejected"
                  ? locationResult.reason instanceof Error
                    ? locationResult.reason.message
                    : "Unable to resolve that location right now."
                  : resolvedLocation
                    ? null
                    : "Enter a real location to search nearby pharmacies.";

              setMedicationError(nextMedicationError);
              setStrengthError(nextStrengthError);
              setLocationError(nextLocationError);

              if (!resolvedMedication) {
                goToStep("medication", "medication");
                return;
              }

              if (nextStrengthError) {
                setMedicationOption(resolvedMedication);
                setMedication(resolvedMedication.label);
                goToStep("strength", "strength");
                return;
              }

              if (!resolvedLocation && !canUseDirectLocationFallback) {
                goToStep("location", "location");
                return;
              }

              const nextLocationLabel =
                resolvedLocation?.display_label || normalizedLocation;
              const nextLocationPlaceId = resolvedLocation?.place_id || null;
              setMedicationOption(resolvedMedication);
              setMedication(resolvedMedication.label);
              setSelectedStrength(resolvedStrength);
              setLocationSelection(
                createLocationSelection(nextLocationLabel, nextLocationPlaceId),
              );
              setLocation(nextLocationLabel);
              setLocationSessionToken(createLocationSessionToken());
              startTransition(() => {
                router.push(
                  buildResultsHref({
                    medication: buildMedicationQueryLabel(
                      resolvedMedication,
                      resolvedStrength,
                    ),
                    location: nextLocationLabel,
                    locationPlaceId: nextLocationPlaceId,
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
          <div
            ref={stepCardRef}
            className={cn(
              "rounded-[1.5rem] border border-slate-200/90 bg-white/92 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] sm:p-6 xl:p-7",
              compact && "rounded-[1.25rem] p-3.5 sm:p-4 xl:p-5",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-[42rem]">
                <div className="text-[0.66rem] uppercase tracking-[0.18em] text-slate-400">
                  {stepCopy.eyebrow}
                </div>
                <h3
                  className={cn(
                    "mt-2 tracking-tight text-slate-950",
                    compact ? "text-[1.08rem]" : "text-[1.26rem] sm:text-[1.4rem]",
                  )}
                >
                  {stepCopy.title}
                </h3>
                <p className="mt-1.5 max-w-[38rem] text-[0.86rem] leading-6 text-slate-600">
                  {stepCopy.description}
                </p>
              </div>

              {activeStep !== "medication" ? (
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#156d95]/10"
                  onClick={() =>
                    goToStep(
                      resolvePreviousStep(activeStep, showsStrengthCheckpoint),
                      resolvePreviousStep(activeStep, showsStrengthCheckpoint),
                    )
                  }
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : null}
            </div>

            {selectionSummaryItems.length ? (
              <div
                className={cn(
                  "mt-4 grid gap-3",
                  compact ? "sm:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3",
                )}
              >
                {selectionSummaryItems.map((item) => (
                  <SelectionSummaryChip
                    key={item.key}
                    label={item.label}
                    value={item.value}
                    placeholder={item.placeholder}
                    icon={item.icon}
                    state={item.state}
                    onClick={item.onClick}
                    className={
                      compact &&
                      selectionSummaryItems.length === 3 &&
                      item.key === "location"
                        ? "sm:col-span-2"
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : null}

            <div className="mt-4 border-t border-slate-200/80 pt-4">
              <AnimatePresence custom={transitionDirection} initial={false} mode="wait">
                <motion.div
                  key={activeStep}
                  custom={transitionDirection}
                  variants={stepMotion}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={stepTransition}
                  className="space-y-4"
                >
                  {activeStep === "medication" ? (
                    <div className="space-y-4">
                      <MedicationCombobox
                        className="max-w-none"
                        label="Medication"
                        placeholder="Search medication"
                        value={medication}
                        selectedOptionId={medicationOption?.id || null}
                        helperText={
                          medicationSupportText ||
                          "Search by brand, generic, or exact presentation."
                        }
                        onValueChange={handleMedicationInputChange}
                        onSelect={handleMedicationSelection}
                        emptyMessage="No medication matches yet. Try a brand, generic, or strength."
                        error={medicationError}
                        inputRef={medicationInputRef}
                        panelMode="floating"
                        inputClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_1px_1px_rgba(15,23,42,0.02),0_8px_16px_rgba(15,23,42,0.04)]"
                        panelClassName="mt-2"
                      />

                      {showSamples && !compact && !medication.trim() ? (
                        <div className="rounded-[1.05rem] border border-slate-200/80 bg-white/70 px-4 py-3">
                          <div className="text-[0.66rem] uppercase tracking-[0.18em] text-slate-400">
                            Common starting points
                          </div>
                          <p className="mt-1.5 text-[0.8rem] leading-6 text-slate-600">
                            Use one if it matches what you need.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {featuredSearches.map((search) => (
                              <button
                                key={search.id}
                                type="button"
                                disabled={Boolean(isApplyingSampleId)}
                                className="inline-flex min-h-8 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.88rem] text-slate-600 transition hover:border-[#156d95]/24 hover:text-[#156d95] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#156d95]/10 disabled:cursor-wait disabled:opacity-70"
                                onClick={() => void handleFeaturedSearch(search)}
                              >
                                {isApplyingSampleId === search.id
                                  ? "Loading..."
                                  : search.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {activeStep === "strength" ? (
                    <div className="space-y-3.5">
                      <p className="max-w-2xl text-[0.88rem] leading-6 text-slate-600">
                        Pick the exact strength you want the nearby search to
                        carry forward.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {medicationOption?.strengths.map((strength, index) => {
                          const isSelected = strength.value === selectedStrength;

                          return (
                            <button
                              key={strength.id}
                              ref={(node) => {
                                strengthButtonRefs.current[index] = node;
                              }}
                              type="button"
                              className={cn(
                                "group flex min-h-[4.5rem] items-start justify-between rounded-[1.08rem] border px-4 py-3.5 text-left transition-[border-color,background-color,transform,box-shadow] duration-150 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#156d95]/10",
                                isSelected
                                  ? "border-[#156d95]/24 bg-[#156d95]/8 text-[#0f5d7d] shadow-[0_8px_20px_rgba(21,109,149,0.08)]"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-[#156d95]/18",
                              )}
                              onClick={() => handleStrengthSelection(strength.value)}
                            >
                              <span className="text-[1rem] font-semibold leading-6">
                                {strength.label}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
                                  isSelected
                                    ? "border-[#156d95]/22 bg-white text-[#156d95]"
                                    : "border-slate-200 text-slate-300 group-hover:border-[#156d95]/22 group-hover:text-[#156d95]",
                                )}
                              >
                                <Check className="h-4 w-4" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {strengthError ? (
                        <p className="search-field-error">{strengthError}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {activeStep === "location" ? (
                    <div className="space-y-3.5">
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(15rem,0.34fr)] xl:items-end">
                        <LocationCombobox
                          className="max-w-none"
                          label="Location"
                          placeholder="City, ZIP, or address"
                          value={location}
                          selectedPlaceId={locationSelection?.placeId || null}
                          sessionToken={locationSessionToken}
                          onValueChange={handleLocationInputChange}
                          onSelect={(option) => {
                            setLocationSelection(
                              createLocationSelection(
                                option.description,
                                option.placeId,
                              ),
                            );
                            setLocation(option.description);
                            setLocationError(null);
                          }}
                          error={locationError}
                          helperText="Pick a live suggestion or keep the typed text for direct resolution at search time."
                          inputRef={locationInputRef}
                          submitOnSelect={false}
                        />

                        <div className="rounded-[1.08rem] border border-slate-200/85 bg-slate-50/78 px-4 py-4">
                          <p className="text-sm font-medium text-slate-900">
                            Continue when the search area looks right.
                          </p>
                          <p className="mt-1 text-[0.82rem] leading-6 text-slate-600">
                            You can still adjust radius, sort, and open-now on
                            the next step.
                          </p>
                          <button
                            type="button"
                            className="action-button-primary mt-3 min-h-[3.05rem] w-full px-5 text-sm"
                            onClick={handleLocationContinue}
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeStep === "review" ? (
                    <div className="space-y-4">
                      <div className="grid gap-x-3.5 gap-y-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
                        <label className="search-field-stack">
                          <span className="search-field-label">Radius</span>
                          <select
                            className="search-select-control"
                            value={radiusMiles}
                            onChange={(event) =>
                              setRadiusMiles(Number(event.target.value))
                            }
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
                              setSortBy(
                                event.target.value as
                                  | "best_match"
                                  | "distance"
                                  | "rating",
                              )
                            }
                          >
                            <option value="best_match">Best overall match</option>
                            <option value="distance">Closest first</option>
                            <option value="rating">Highest rating</option>
                          </select>
                        </label>

                        <label className="search-field-stack xl:min-w-[13rem]">
                          <span className="search-field-label">Availability</span>
                          <span className="inline-flex min-h-[3.35rem] w-full items-center gap-2.5 rounded-[1.08rem] border border-slate-200/95 bg-slate-50/85 px-3.5 text-[0.94rem] leading-6 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_18px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,background-color,color] duration-150 focus-within:border-[#156d95] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#156d95]/10">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-[#156d95] focus:ring-[#156d95]"
                              checked={onlyOpenNow}
                              onChange={(event) =>
                                setOnlyOpenNow(event.target.checked)
                              }
                            />
                            <span className="min-w-0">Open now only</span>
                          </span>
                        </label>
                      </div>

                      <div className="grid gap-4 rounded-[1rem] border border-slate-200/85 bg-slate-50/78 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                        <div className="max-w-[40rem]">
                          <p className="text-sm font-medium text-slate-900">
                            Use filters to reshape the nearby shortlist.
                          </p>
                          <p className="mt-1 text-[0.82rem] leading-6 text-slate-600">
                            Availability still needs a direct call before pickup
                            or transfer.
                          </p>
                        </div>
                        <button
                          ref={submitButtonRef}
                          type="submit"
                          disabled={isPending || isResolvingSearch}
                          className="action-button-primary min-h-[3.15rem] whitespace-nowrap px-5 text-sm disabled:cursor-wait disabled:opacity-70 xl:min-w-[14rem]"
                        >
                          {isPending || isResolvingSearch
                            ? "Loading..."
                            : submitLabel}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
