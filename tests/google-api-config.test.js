"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GOOGLE_API_QUOTA_BACKOFF_MS,
  MISSING_GOOGLE_API_KEY_CODE,
  activateGoogleApiBackoff,
  clearGoogleApiBackoff,
  createGoogleApiUnavailablePayload,
  getGoogleApiBackoffState,
  getGoogleApiKey,
  getGoogleApiRuntimeMetadata,
} = require("../lib/server/google-api-config");

test("google api config trims the server key and reports runtime metadata", () => {
  const originalGoogleApiKey = process.env.GOOGLE_API_KEY;
  const originalVercel = process.env.VERCEL;
  const originalVercelEnv = process.env.VERCEL_ENV;

  process.env.GOOGLE_API_KEY = "  test-google-key  ";
  process.env.VERCEL = "1";
  process.env.VERCEL_ENV = "preview";

  try {
    assert.equal(getGoogleApiKey(), "test-google-key");
    assert.deepEqual(getGoogleApiRuntimeMetadata(), {
      runtime: "vercel",
      nodeEnv: process.env.NODE_ENV || null,
      vercelEnv: "preview",
      hasGoogleApiKey: true,
      googleApiBackoffActive: false,
    });
  } finally {
    if (originalGoogleApiKey === undefined) {
      delete process.env.GOOGLE_API_KEY;
    } else {
      process.env.GOOGLE_API_KEY = originalGoogleApiKey;
    }

    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }

    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
  }
});

test("google api unavailable payload exposes a stable diagnostic code", () => {
  assert.deepEqual(
    createGoogleApiUnavailablePayload("Location suggestions are temporarily unavailable."),
    {
      error: "Location suggestions are temporarily unavailable.",
      code: MISSING_GOOGLE_API_KEY_CODE,
    },
  );
});

test("google api backoff activates and expires cleanly", () => {
  const originalNow = Date.now;
  const baseNow = originalNow();

  try {
    clearGoogleApiBackoff();
    Date.now = () => baseNow;

    const activeBackoff = activateGoogleApiBackoff({
      code: "over_query_limit",
      message: "Location service is temporarily unavailable.",
      durationMs: GOOGLE_API_QUOTA_BACKOFF_MS,
    });

    assert.equal(activeBackoff.code, "over_query_limit");
    assert.equal(activeBackoff.message, "Location service is temporarily unavailable.");
    assert.ok(activeBackoff.retryAfterSeconds >= 1);
    assert.equal(Boolean(getGoogleApiBackoffState()), true);

    Date.now = () => baseNow + GOOGLE_API_QUOTA_BACKOFF_MS + 1;
    assert.equal(getGoogleApiBackoffState(), null);
  } finally {
    clearGoogleApiBackoff();
    Date.now = originalNow;
  }
});
