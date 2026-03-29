import { createRequire } from "module";
import { NextResponse } from "next/server";

const require = createRequire(import.meta.url);
const {
  geocodeLocation,
  getSearchInput,
  searchNearbyPharmacies,
} = require("../../../../api/_lib/pharmacy-search");

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
  try {
    const body = await readRequestBody(request);
    const input = getSearchInput(
      {
        method: request.method,
        query: Object.fromEntries(request.nextUrl.searchParams.entries()),
      },
      body,
    );

    if (!input.medication) {
      return NextResponse.json({ error: "Medication is required." }, { status: 400 });
    }

    if (!input.location) {
      return NextResponse.json({ error: "Location is required." }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Google pharmacy search is not configured yet.",
        },
        { status: 503 },
      );
    }

    const resolvedLocation = await geocodeLocation(input.location, apiKey);
    const searchResult = await searchNearbyPharmacies({
      medication: input.medication,
      center: resolvedLocation.coordinates,
      radiusMiles: input.radiusMiles,
      onlyOpenNow: input.onlyOpenNow,
      apiKey,
      sortBy: input.sortBy,
    });

    return NextResponse.json({
      status: "ok",
      query: {
        medication: input.medication,
        location: input.location,
        radius_miles: input.radiusMiles,
        only_open_now: input.onlyOpenNow,
        sort_by: input.sortBy,
      },
      location: resolvedLocation,
      disclaimer: searchResult.disclaimer,
      medication_profile: searchResult.medication_profile,
      guidance: searchResult.guidance,
      results: searchResult.results,
      recommended: searchResult.recommended,
      counts: searchResult.counts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Unexpected search failure.",
      },
      { status: error.statusCode || 500 },
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
