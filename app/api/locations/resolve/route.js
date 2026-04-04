import { createRequire } from "module";
import { NextResponse } from "next/server";

const require = createRequire(import.meta.url);
const { resolveLocationInput } = require("../../../../lib/server/pharmacy-search");
const {
  createGoogleApiUnavailablePayload,
  getGoogleApiKey,
  logGoogleApiConfigurationError,
  logGoogleApiRequestError,
} = require("../../../../lib/server/google-api-config");
const {
  buildRateLimitHeaders,
  consumeRateLimitByIp,
  toPublicError,
  validatePublicJsonPostRequest,
} = require("../../../../lib/server/api-security");

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

async function handleResolve(request) {
  let query = "";
  let placeId = "";
  let sessionToken = "";
  let rateLimit = null;

  try {
    const requestPolicyError = validatePublicJsonPostRequest(request);

    if (requestPolicyError) {
      return NextResponse.json(
        { error: requestPolicyError.message },
        { status: requestPolicyError.statusCode },
      );
    }

    const body = await readRequestBody(request);
    query =
      (request.method === "GET"
        ? request.nextUrl.searchParams.get("q")
        : body.query || body.location) || "";
    placeId =
      (request.method === "GET"
        ? request.nextUrl.searchParams.get("placeId")
        : body.placeId || body.locationPlaceId) || "";
    sessionToken =
      (request.method === "GET"
        ? request.nextUrl.searchParams.get("sessionToken")
        : body.sessionToken) || "";

    rateLimit = consumeRateLimitByIp(request, {
      bucket: "locations-resolve",
      limit: 30,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many location lookups. Please try again shortly." },
        {
          status: 429,
          headers: {
            ...buildRateLimitHeaders(rateLimit),
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const apiKey = getGoogleApiKey();

    if (!apiKey) {
      logGoogleApiConfigurationError("locations/resolve", {
        queryLength: query.trim().length,
        hasPlaceId: Boolean(placeId),
        hasSessionToken: Boolean(sessionToken),
      });

      return NextResponse.json(
        createGoogleApiUnavailablePayload("Location search is temporarily unavailable."),
        {
          status: 503,
          headers: buildRateLimitHeaders(rateLimit),
        },
      );
    }

    const location = await resolveLocationInput(
      {
        query,
        placeId,
        sessionToken,
      },
      apiKey,
    );

    return NextResponse.json({
      status: "ok",
      location,
    }, {
      headers: buildRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    if (error.code === "location_not_found" || error.code === "missing_location") {
      return NextResponse.json(
        {
          status: "unresolved",
          error: error.message || "No location match was found for that search.",
          code: error.code,
        },
        rateLimit
          ? {
              headers: buildRateLimitHeaders(rateLimit),
            }
          : undefined,
      );
    }

    logGoogleApiRequestError("locations/resolve", error, {
      queryLength: query.trim().length,
      hasPlaceId: Boolean(placeId),
      hasSessionToken: Boolean(sessionToken),
    });
    const publicError = toPublicError(error, "Unable to resolve that location right now.");

    return NextResponse.json(
      {
        error: publicError.message,
      },
      rateLimit
        ? {
            status: publicError.statusCode,
            headers: buildRateLimitHeaders(rateLimit),
          }
        : { status: publicError.statusCode },
    );
  }
}

export async function GET(request) {
  return handleResolve(request);
}

export async function POST(request) {
  return handleResolve(request);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
    },
  });
}
