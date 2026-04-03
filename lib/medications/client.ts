import type { MedicationSearchOption, MedicationSearchResponse } from "@/lib/medications/types";

const MEDICATION_SEARCH_CACHE_LIMIT = 48;
const medicationSearchCache = new Map<string, MedicationSearchResponse>();
const medicationSearchInFlight = new Map<string, Promise<MedicationSearchResponse>>();

function buildCacheKey(query: string, exact: boolean, limit: number) {
  return JSON.stringify({
    query: query.trim().toLowerCase(),
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
  medicationSearchCache.set(cacheKey, payload);

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
  const normalizedQuery = query.trim();
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
  const normalizedQuery = query.trim();
  const cacheKey = buildCacheKey(normalizedQuery, exact, limit);
  const cached = medicationSearchCache.get(cacheKey);

  if (cached) {
    return cached;
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

export async function resolveMedicationOption(query: string) {
  const response = await fetchMedicationSearch(query, { exact: true, limit: 1 });
  return response.results[0] || null;
}

export type { MedicationSearchOption };
