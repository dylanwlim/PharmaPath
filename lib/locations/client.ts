"use client";

export type LocationSuggestion = {
  placeId: string;
  description: string;
  primaryText: string;
  secondaryText: string | null;
  types: string[];
  typeLabel: string;
};

export type ResolvedLocation = {
  raw_query: string;
  display_label: string;
  formatted_address: string;
  name: string | null;
  place_id: string | null;
  coordinates: {
    lat: number;
    lng: number;
  };
  types: string[];
  resolution_source: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  neighborhood: string | null;
  country: string | null;
  country_code: string | null;
  route: string | null;
  street_number: string | null;
};

type LocationSuggestionResponse = {
  status: string;
  results: Array<{
    place_id: string | null;
    description: string;
    primary_text: string;
    secondary_text: string | null;
    types: string[];
    type_label: string;
  }>;
};

type LocationResolveResponse = {
  status: string;
  location: ResolvedLocation;
};

const DIRECT_LOCATION_SEARCH_FALLBACK_CODES = new Set([
  "missing_google_api_key",
  "google_api_error",
  "google_api_timeout",
  "places_autocomplete_failed",
  "place_details_failed",
  "geocoding_failed",
]);
const LOCATION_CACHE_TTL_MS = 5 * 60 * 1000;
const suggestionCache = new Map<
  string,
  { storedAt: number; results: LocationSuggestion[] }
>();
const suggestionInFlight = new Map<string, Promise<{ results: LocationSuggestion[] }>>();
const resolvedLocationCache = new Map<
  string,
  { storedAt: number; location: ResolvedLocation }
>();
const resolvedLocationInFlight = new Map<string, Promise<ResolvedLocation>>();

function sanitizeText(value = "") {
  return String(value).trim();
}

function readCachedValue<T extends { storedAt: number }>(
  cache: Map<string, T>,
  key: string,
) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.storedAt > LOCATION_CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry;
}

function buildSuggestionCacheKey(query: string, limit: number) {
  return `${query.toLowerCase()}::${limit}`;
}

function buildResolvedLocationCacheKey(query: string, placeId: string) {
  return `${query.toLowerCase()}::${placeId.toLowerCase()}`;
}

function getErrorCode(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "code" in payload &&
    typeof payload.code === "string" &&
    payload.code.trim()
  ) {
    return payload.code.trim();
  }

  return "";
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error.trim()
  ) {
    return payload.error.trim();
  }

  return fallback;
}

export class LocationRequestError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "LocationRequestError";
    this.code = sanitizeText(code) || undefined;
  }
}

function createLocationRequestError(payload: unknown, fallback: string) {
  return new LocationRequestError(
    getErrorMessage(payload, fallback),
    getErrorCode(payload),
  );
}

export function createLocationSessionToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `loc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function searchLocationSuggestions(
  query: string,
  {
    limit = 8,
    signal,
    sessionToken,
  }: {
    limit?: number;
    signal?: AbortSignal;
    sessionToken?: string;
  } = {},
) {
  const normalizedQuery = sanitizeText(query);

  if (normalizedQuery.length < 2) {
    return {
      results: [] as LocationSuggestion[],
    };
  }

  const cacheKey = buildSuggestionCacheKey(normalizedQuery, limit);
  const cachedSuggestions = readCachedValue(suggestionCache, cacheKey);

  if (cachedSuggestions) {
    return {
      results: cachedSuggestions.results,
    };
  }

  const inFlightSuggestions = suggestionInFlight.get(cacheKey);
  if (inFlightSuggestions) {
    return inFlightSuggestions;
  }

  const params = new URLSearchParams({
    q: normalizedQuery,
    limit: String(limit),
  });

  if (sessionToken) {
    params.set("sessionToken", sessionToken);
  }

  const request = fetch(`/api/locations/autocomplete?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    signal,
  })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as LocationSuggestionResponse | null;

      if (!response.ok) {
        throw createLocationRequestError(payload, "Unable to load location suggestions right now.");
      }

      const results = (payload?.results || [])
        .filter((item) => item.place_id)
        .map((item) => ({
          placeId: item.place_id as string,
          description: item.description,
          primaryText: item.primary_text,
          secondaryText: item.secondary_text,
          types: item.types,
          typeLabel: item.type_label,
        }));

      suggestionCache.set(cacheKey, {
        storedAt: Date.now(),
        results,
      });

      return { results };
    })
    .finally(() => {
      suggestionInFlight.delete(cacheKey);
    });

  suggestionInFlight.set(cacheKey, request);
  return request;
}

export async function resolveLocationQuery(
  {
    query,
    placeId,
    sessionToken,
  }: {
    query: string;
    placeId?: string | null;
    sessionToken?: string;
  },
  { signal }: { signal?: AbortSignal } = {},
) {
  const normalizedQuery = sanitizeText(query);
  const normalizedPlaceId = sanitizeText(placeId || "");

  if (!normalizedQuery && !normalizedPlaceId) {
    throw new Error("Enter a city, ZIP, address, pharmacy, or landmark.");
  }

  const cacheKey = buildResolvedLocationCacheKey(normalizedQuery, normalizedPlaceId);
  const cachedLocation = readCachedValue(resolvedLocationCache, cacheKey);

  if (cachedLocation) {
    return cachedLocation.location;
  }

  const inFlightLocation = resolvedLocationInFlight.get(cacheKey);
  if (inFlightLocation) {
    return inFlightLocation;
  }

  const request = fetch("/api/locations/resolve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: normalizedQuery,
      placeId: normalizedPlaceId || undefined,
      sessionToken: sessionToken || undefined,
    }),
    signal,
  })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as LocationResolveResponse | null;

      if (!response.ok || !payload?.location) {
        throw createLocationRequestError(payload, "Unable to resolve that location right now.");
      }

      resolvedLocationCache.set(cacheKey, {
        storedAt: Date.now(),
        location: payload.location,
      });

      return payload.location;
    })
    .finally(() => {
      resolvedLocationInFlight.delete(cacheKey);
    });

  resolvedLocationInFlight.set(cacheKey, request);
  return request;
}

export function canFallbackToDirectLocationSearch(error: unknown) {
  if (!(error instanceof LocationRequestError)) {
    return false;
  }

  return Boolean(error.code && DIRECT_LOCATION_SEARCH_FALLBACK_CODES.has(error.code));
}
