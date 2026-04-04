import { createRequire } from "node:module";
import { NextResponse } from "next/server";

const require = createRequire(import.meta.url);
const {
  DEFAULT_SEARCH_LIMIT,
  searchMedicationOptions,
} = require("../../../../lib/medications/index-store");
const {
  buildRateLimitHeaders,
  consumeRateLimitByIp,
  logApiFailure,
  toPublicError,
} = require("../../../../lib/server/api-security");

export const dynamic = "force-dynamic";

function sanitizeText(value: string | null) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export async function GET(request: Request) {
  let rateLimit = null;

  try {
    const { searchParams } = new URL(request.url);
    const assetBaseUrl = new URL(request.url).origin;
    const query = sanitizeText(searchParams.get("q") || searchParams.get("query"));
    const exact = ["1", "true", "yes"].includes(
      sanitizeText(searchParams.get("exact")).toLowerCase(),
    );
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || DEFAULT_SEARCH_LIMIT, 1),
      12,
    );
    rateLimit = consumeRateLimitByIp(request, {
      bucket: "medications-search",
      limit: 60,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many medication search requests. Please try again shortly.",
        },
        {
          status: 429,
          headers: {
            ...buildRateLimitHeaders(rateLimit),
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const { results, snapshot } = await searchMedicationOptions(query, {
      limit,
      exact,
      assetBaseUrl,
    });

    return NextResponse.json(
      {
        status: "ok",
        query,
        exact,
        results,
        dataFreshness: {
          generatedAt: snapshot.generatedAt,
          datasetLastUpdated: snapshot.source.datasetLastUpdated,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=86400",
          ...buildRateLimitHeaders(rateLimit),
        },
      },
    );
  } catch (error) {
    logApiFailure("medications/search", error, {
      method: request.method,
    });
    const publicError = toPublicError(error, "Unable to search the medication index right now.");

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
