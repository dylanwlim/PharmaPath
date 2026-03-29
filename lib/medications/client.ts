import type { MedicationSearchOption, MedicationSearchResponse } from "@/lib/medications/types";

const medicationSearchCache = new Map<string, MedicationSearchResponse>();

function buildCacheKey(query: string, exact: boolean, limit: number) {
  return JSON.stringify({
    query: query.trim().toLowerCase(),
    exact,
    limit,
  });
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
  const cacheKey = buildCacheKey(query, exact, limit);

  if (!signal && medicationSearchCache.has(cacheKey)) {
    return medicationSearchCache.get(cacheKey)!;
  }

  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  });

  if (exact) {
    params.set("exact", "1");
  }

  const response = await fetch(`/api/medications/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  const payload = (await response.json().catch(() => null)) as MedicationSearchResponse | {
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload && "error" in payload && payload.error ? payload.error : "Unable to search medications right now.");
  }

  medicationSearchCache.set(cacheKey, payload as MedicationSearchResponse);
  return payload as MedicationSearchResponse;
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
