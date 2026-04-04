import { createRequire } from "module";
import { NextResponse } from "next/server";

const require = createRequire(import.meta.url);
const {
  getSearchInput,
  resolveLocationInput,
  searchNearbyPharmacies,
} = require("../../../../lib/server/pharmacy-search");
const { resolveMedicationProfile } = require("../../../../lib/medications/index-store");
const {
  buildUnavailableNearbyResponse,
  shouldDegradeNearbySearch,
} = require("../../../../lib/server/nearby-search-fallback");
const {
  MISSING_GOOGLE_API_KEY_CODE,
  getGoogleApiKey,
  logGoogleApiConfigurationError,
  logGoogleApiRequestError,
} = require("../../../../lib/server/google-api-config");
const apiSecurity = require("../../../../lib/server/api-security");

const {
  buildRateLimitHeaders: buildApiRateLimitHeaders,
  consumeRateLimitByIp: consumeApiRateLimitByIp,
  logApiFailure: logSecurityFailure,
  toPublicError: toPublicApiError,
  validatePublicJsonPostRequest: validateApiJsonPostRequest,
} = apiSecurity;

export const dynamic = "force-dynamic";

async function readRequestBody(request) {
  if (request.method !== "POST") {
    return {};
  }

  try {
    return await request.json();
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

async function handleSearch(request) {
  let rateLimit = null;

  try {
    const requestPolicyError = validateApiJsonPostRequest(request);

    if (requestPolicyError) {
      return NextResponse.json(
        {
          error: requestPolicyError.message,
        },
        { status: requestPolicyError.statusCode },
      );
    }

    const body = await readRequestBody(request);
    const searchParams = request.nextUrl.searchParams;
    const assetBaseUrl = new URL(request.url).origin;
    const input = getSearchInput(
      {
        method: request.method,
        query: Object.fromEntries(searchParams.entries()),
      },
      body,
    );

    if (!input.medication) {
      return NextResponse.json({ error: "Medication is required." }, { status: 400 });
    }

    if (!input.location) {
      return NextResponse.json({ error: "Location is required." }, { status: 400 });
    }

    rateLimit = consumeApiRateLimitByIp(request, {
      bucket: "pharmacies-search",
      limit: 24,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many pharmacy searches. Please wait a moment and try again.",
        },
        {
          status: 429,
          headers: {
            ...buildApiRateLimitHeaders(rateLimit),
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const apiKey = getGoogleApiKey();
    const medicationProfilePromise = resolveMedicationProfile(input.medication, { assetBaseUrl });

    if (!apiKey) {
      logGoogleApiConfigurationError("pharmacies/search", {
        medicationLength: input.medication.length,
        locationLength: input.location.length,
        hasLocationPlaceId: Boolean(input.locationPlaceId),
        radiusMiles: input.radiusMiles,
        sortBy: input.sortBy,
        onlyOpenNow: input.onlyOpenNow,
      });

      return NextResponse.json(
        buildUnavailableNearbyResponse(
          input,
          await medicationProfilePromise,
          "Live nearby pharmacy search is unavailable in this environment.",
          MISSING_GOOGLE_API_KEY_CODE,
        ),
        {
          headers: buildApiRateLimitHeaders(rateLimit),
        },
      );
    }

    try {
      const [medicationProfile, resolvedLocation] = await Promise.all([
        medicationProfilePromise,
        resolveLocationInput(
          {
            query: input.location,
            placeId: input.locationPlaceId,
          },
          apiKey,
        ),
      ]);
      const searchResult = await searchNearbyPharmacies({
        medication: medicationProfile.canonicalLabel,
        medicationProfileKey: medicationProfile.workflowCategory,
        center: resolvedLocation.coordinates,
        radiusMiles: input.radiusMiles,
        onlyOpenNow: input.onlyOpenNow,
        apiKey,
        sortBy: input.sortBy,
      });

      return NextResponse.json({
        status: "ok",
        query: {
          medication: medicationProfile.canonicalLabel,
          location: input.location,
          location_place_id: input.locationPlaceId || resolvedLocation.place_id || null,
          radius_miles: input.radiusMiles,
          only_open_now: input.onlyOpenNow,
          sort_by: input.sortBy,
        },
        location: resolvedLocation,
        disclaimer: searchResult.disclaimer,
        medication_profile: {
          ...searchResult.medication_profile,
          source: medicationProfile.source,
          demo_only: medicationProfile.demoOnly,
          demo_note: medicationProfile.demoNote,
          simulated_user_count: medicationProfile.simulatedUserCount,
          medication_label: medicationProfile.medicationLabel,
          selected_strength: medicationProfile.selectedStrength,
          dosage_form: medicationProfile.dosageForm,
          formulation: medicationProfile.formulation,
        },
        guidance: searchResult.guidance,
        results: searchResult.results,
        recommended: searchResult.recommended,
        counts: searchResult.counts,
      }, {
        headers: buildApiRateLimitHeaders(rateLimit),
      });
    } catch (error) {
      if (!shouldDegradeNearbySearch(error)) {
        throw error;
      }

      logGoogleApiRequestError("pharmacies/search", error, {
        medicationLength: input.medication.length,
        locationLength: input.location.length,
        hasLocationPlaceId: Boolean(input.locationPlaceId),
        radiusMiles: input.radiusMiles,
        sortBy: input.sortBy,
        onlyOpenNow: input.onlyOpenNow,
      });

      return NextResponse.json(
        buildUnavailableNearbyResponse(
          input,
          await medicationProfilePromise,
          "Live nearby pharmacy search is temporarily unavailable.",
          error.code || null,
        ),
        {
          headers: buildApiRateLimitHeaders(rateLimit),
        },
      );
    }
  } catch (error) {
    logSecurityFailure("pharmacies/search", error, {
      method: request.method,
    });
    const publicError = toPublicApiError(error, "Unable to search nearby pharmacies right now.");

    return NextResponse.json(
      {
        error: publicError.message,
      },
      rateLimit
        ? {
            status: publicError.statusCode,
            headers: buildApiRateLimitHeaders(rateLimit),
          }
        : { status: publicError.statusCode },
    );
  }
}

export async function GET(request) {
  return handleSearch(request);
}

export async function POST(request) {
  return handleSearch(request);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
    },
  });
}
