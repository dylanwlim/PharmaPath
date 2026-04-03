import {
  buildMedicationQueryLabel,
  normalizeStrengthValue,
} from "@/lib/medications/selection";
import type {
  MedicationSearchOption,
  MedicationSearchResponse,
} from "@/lib/medications/types";

const MEDICATION_SEARCH_CACHE_LIMIT = 48;
const MEDICATION_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const MEDICATION_SELECTION_CACHE_LIMIT = 96;
const medicationSearchCache = new Map<
  string,
  { storedAt: number; payload: MedicationSearchResponse }
>();
const medicationSearchInFlight = new Map<string, Promise<MedicationSearchResponse>>();
const medicationSelectionCache = new Map<string, MedicationSearchOption>();

function sanitizeText(value = "") {
  return String(value).trim();
}

export function normalizeMedicationSearchQuery(value: string) {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/\s*\/\s*/g, "/")
    .replace(/[^\p{L}\p{N}%/+.,-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchableMedicationText(option: MedicationSearchOption) {
  return normalizeMedicationSearchQuery(
    [
      option.label,
      option.value,
      option.description,
      option.canonicalName,
      option.canonicalLabel,
      option.formulation,
      option.dosageForm,
      option.route,
      option.matchedStrength,
      ...option.strengths.map((strength) => strength.value),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function scoreMedicationOptionLocally(
  option: MedicationSearchOption,
  normalizedQuery: string,
  exact = false,
) {
  if (!normalizedQuery) {
    return Number.POSITIVE_INFINITY;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const aliasCandidates = [
    option.label,
    option.value,
    option.canonicalName,
    option.canonicalLabel,
    option.matchedStrength,
    ...option.strengths.map((strength) => strength.value),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeMedicationSearchQuery(value));
  let bestScore = Number.POSITIVE_INFINITY;

  aliasCandidates.forEach((alias) => {
    if (!alias) {
      return;
    }

    if (alias === normalizedQuery) {
      bestScore = Math.min(bestScore, 0);
      return;
    }

    if (alias.startsWith(normalizedQuery)) {
      bestScore = Math.min(bestScore, 10 + alias.length / 1000);
      return;
    }

    if (alias.includes(` ${normalizedQuery}`)) {
      bestScore = Math.min(bestScore, 18);
      return;
    }

    if (alias.includes(normalizedQuery)) {
      bestScore = Math.min(bestScore, 26);
    }
  });

  if (exact || bestScore !== Number.POSITIVE_INFINITY) {
    return bestScore;
  }

  const searchableText = buildSearchableMedicationText(option);
  if (queryTokens.length && queryTokens.every((token) => searchableText.includes(token))) {
    return 40 + queryTokens.length;
  }

  return Number.POSITIVE_INFINITY;
}

function sortMedicationOptions(left: MedicationSearchOption, right: MedicationSearchOption) {
  return left.label.localeCompare(right.label);
}

function findMatchingMedicationOptions(
  query: string,
  options: MedicationSearchOption[],
  { exact = false, limit = 8 }: { exact?: boolean; limit?: number } = {},
) {
  const normalizedQuery = normalizeMedicationSearchQuery(query);

  return options
    .map((option) => ({
      option,
      score: scoreMedicationOptionLocally(option, normalizedQuery, exact),
    }))
    .filter((entry) => entry.score !== Number.POSITIVE_INFINITY)
    .sort(
      (left, right) =>
        left.score - right.score || sortMedicationOptions(left.option, right.option),
    )
    .slice(0, limit)
    .map((entry) => entry.option);
}

function trimSelectionCache() {
  if (medicationSelectionCache.size <= MEDICATION_SELECTION_CACHE_LIMIT) {
    return;
  }

  const oldestKey = medicationSelectionCache.keys().next().value;
  if (oldestKey) {
    medicationSelectionCache.delete(oldestKey);
  }
}

function rememberMedicationSelection(option: MedicationSearchOption) {
  const baseOption = {
    ...option,
    matchedStrength: option.matchedStrength
      ? normalizeStrengthValue(option.matchedStrength)
      : option.matchedStrength ?? null,
  };
  const variants = [
    baseOption,
    ...baseOption.strengths.map((strength) => ({
      ...baseOption,
      matchedStrength: strength.value,
    })),
  ];

  variants.forEach((variant) => {
    const keys = new Set(
      [
        variant.label,
        variant.value,
        variant.canonicalLabel,
        variant.canonicalName,
        variant.matchedStrength
          ? `${variant.label} ${variant.matchedStrength}`
          : null,
        variant.matchedStrength
          ? `${variant.canonicalName} ${variant.matchedStrength}`
          : null,
        variant.matchedStrength
          ? buildMedicationQueryLabel(variant, variant.matchedStrength)
          : null,
      ]
        .filter(Boolean)
        .map((value) => normalizeMedicationSearchQuery(value as string)),
    );

    keys.forEach((key) => {
      medicationSelectionCache.delete(key);
      medicationSelectionCache.set(key, variant);
      trimSelectionCache();
    });
  });
}

function rememberMedicationSelectionsFromResponse(payload: MedicationSearchResponse) {
  payload.results.forEach((option) => rememberMedicationSelection(option));
}

function buildCacheKey(query: string, exact: boolean, limit: number) {
  return JSON.stringify({
    query: normalizeMedicationSearchQuery(query),
    exact,
    limit,
  });
}

function createAbortError() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Medication search was aborted.", "AbortError");
  }

  const error = new Error("Medication search was aborted.");
  error.name = "AbortError";
  return error;
}

function rememberMedicationSearch(
  cacheKey: string,
  payload: MedicationSearchResponse,
) {
  medicationSearchCache.delete(cacheKey);
  medicationSearchCache.set(cacheKey, {
    storedAt: Date.now(),
    payload,
  });
  rememberMedicationSelectionsFromResponse(payload);

  if (medicationSearchCache.size <= MEDICATION_SEARCH_CACHE_LIMIT) {
    return;
  }

  const oldestKey = medicationSearchCache.keys().next().value;
  if (oldestKey) {
    medicationSearchCache.delete(oldestKey);
  }
}

function withAbortSignal<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => reject(createAbortError());

    signal.addEventListener("abort", handleAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener("abort", handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", handleAbort);
        reject(error);
      },
    );
  });
}

async function requestMedicationSearch(
  query: string,
  {
    exact = false,
    limit = 8,
  }: {
    exact?: boolean;
    limit?: number;
  } = {},
) {
  const normalizedQuery = normalizeMedicationSearchQuery(query);
  const cacheKey = buildCacheKey(normalizedQuery, exact, limit);

  const params = new URLSearchParams({
    q: normalizedQuery,
    limit: String(limit),
  });

  if (exact) {
    params.set("exact", "1");
  }

  const response = await fetch(`/api/medications/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  const payload = (await response.json().catch(() => null)) as MedicationSearchResponse | {
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload && "error" in payload && payload.error ? payload.error : "Unable to search medications right now.");
  }

  rememberMedicationSearch(cacheKey, payload as MedicationSearchResponse);
  return payload as MedicationSearchResponse;
}

async function fetchMedicationSearch(
  query: string,
  {
    exact = false,
    limit = 8,
    signal,
  }: {
    exact?: boolean;
    limit?: number;
    signal?: AbortSignal;
  } = {},
) {
  const normalizedQuery = normalizeMedicationSearchQuery(query);
  const cacheKey = buildCacheKey(normalizedQuery, exact, limit);
  const cached = medicationSearchCache.get(cacheKey);

  if (cached && Date.now() - cached.storedAt <= MEDICATION_SEARCH_CACHE_TTL_MS) {
    medicationSearchCache.delete(cacheKey);
    medicationSearchCache.set(cacheKey, cached);
    return cached.payload;
  }

  if (cached) {
    medicationSearchCache.delete(cacheKey);
  }

  let inFlight = medicationSearchInFlight.get(cacheKey);

  if (!inFlight) {
    inFlight = requestMedicationSearch(normalizedQuery, { exact, limit }).finally(() => {
      medicationSearchInFlight.delete(cacheKey);
    });
    medicationSearchInFlight.set(cacheKey, inFlight);
  }

  return withAbortSignal(inFlight, signal);
}

export async function searchMedicationIndex(
  query: string,
  options: {
    limit?: number;
    signal?: AbortSignal;
  } = {},
) {
  return fetchMedicationSearch(query, options);
}

export function getCachedMedicationSelection(
  query: string,
  selectedStrength?: string | null,
) {
  const normalizedQuery = normalizeMedicationSearchQuery(query);
  const normalizedStrength = normalizeStrengthValue(selectedStrength || "");
  const lookupKeys = [
    normalizedStrength
      ? normalizeMedicationSearchQuery(`${query} ${normalizedStrength}`)
      : null,
    normalizedQuery,
  ].filter(Boolean) as string[];

  for (const key of lookupKeys) {
    const cached = medicationSelectionCache.get(key);
    if (cached) {
      medicationSelectionCache.delete(key);
      medicationSelectionCache.set(key, cached);
      return normalizedStrength && cached.matchedStrength !== normalizedStrength
        ? { ...cached, matchedStrength: normalizedStrength }
        : cached;
    }
  }

  return null;
}

export function getMedicationSearchPreview(
  query: string,
  { limit = 8 }: { limit?: number } = {},
) {
  const normalizedQuery = normalizeMedicationSearchQuery(query);

  if (!normalizedQuery) {
    return null;
  }

  const exactCacheKey = buildCacheKey(normalizedQuery, false, limit);
  const exactCached = medicationSearchCache.get(exactCacheKey);
  if (
    exactCached &&
    Date.now() - exactCached.storedAt <= MEDICATION_SEARCH_CACHE_TTL_MS
  ) {
    return exactCached.payload;
  }

  let bestPreviewQuery = "";
  let bestPreviewPayload: MedicationSearchResponse | null = null;

  for (const entry of medicationSearchCache.values()) {
    if (Date.now() - entry.storedAt > MEDICATION_SEARCH_CACHE_TTL_MS) {
      continue;
    }

    const candidateQuery = normalizeMedicationSearchQuery(entry.payload.query);
    if (
      !candidateQuery ||
      candidateQuery === normalizedQuery ||
      !normalizedQuery.startsWith(candidateQuery)
    ) {
      continue;
    }

    if (!bestPreviewPayload || candidateQuery.length > bestPreviewQuery.length) {
      bestPreviewQuery = candidateQuery;
      bestPreviewPayload = entry.payload;
    }
  }

  if (!bestPreviewPayload) {
    return null;
  }

  const filteredResults = findMatchingMedicationOptions(
    normalizedQuery,
    bestPreviewPayload.results,
    { limit },
  );

  if (!filteredResults.length) {
    return null;
  }

  return {
    ...bestPreviewPayload,
    query: normalizedQuery,
    results: filteredResults,
  } satisfies MedicationSearchResponse;
}

export async function resolveMedicationOption(query: string) {
  const cachedSelection = getCachedMedicationSelection(query);
  if (cachedSelection) {
    return cachedSelection;
  }

  const response = await fetchMedicationSearch(query, { exact: true, limit: 1 });
  return response.results[0] || null;
}

export type { MedicationSearchOption };
