import { createRequire } from "module";
import { NextResponse } from "next/server";

const require = createRequire(import.meta.url);
const { autocompleteLocationSuggestions } = require("../../../../lib/server/pharmacy-search");
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
} = require("../../../../lib/server/api-security");

export const dynamic = "force-dynamic";

function parseLimit(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 8;
  }

  return Math.min(Math.max(Math.round(numericValue), 1), 10);
}

export async function GET(request) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const sessionToken = request.nextUrl.searchParams.get("sessionToken")?.trim() || "";
  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
  let rateLimit = null;

  try {
    if (!query) {
      return NextResponse.json({
        status: "ok",
        results: [],
      });
    }

    rateLimit = consumeRateLimitByIp(request, {
      bucket: "locations-autocomplete",
      limit: 50,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many location suggestion requests. Please slow down." },
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
      logGoogleApiConfigurationError("locations/autocomplete", {
        queryLength: query.length,
        hasSessionToken: Boolean(sessionToken),
      });

      return NextResponse.json(
        createGoogleApiUnavailablePayload("Location suggestions are temporarily unavailable."),
        {
          status: 503,
          headers: buildRateLimitHeaders(rateLimit),
        },
      );
    }

    const results = await autocompleteLocationSuggestions(query, apiKey, {
      limit,
      sessionToken: sessionToken || undefined,
    });

    return NextResponse.json({
      status: "ok",
      results,
    }, {
      headers: buildRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    logGoogleApiRequestError("locations/autocomplete", error, {
      queryLength: query.length,
      hasSessionToken: Boolean(sessionToken),
      limit,
    });
    const publicError = toPublicError(
      error,
      "Unable to load location suggestions right now.",
    );

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

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, OPTIONS",
    },
  });
}
