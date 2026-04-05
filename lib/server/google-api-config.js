"use strict";

const GOOGLE_API_KEY_ENV_NAME = "GOOGLE_API_KEY";
const MISSING_GOOGLE_API_KEY_CODE = "missing_google_api_key";
const GOOGLE_API_QUOTA_BACKOFF_MS = 60 * 1000;
const GOOGLE_API_REQUEST_DENIED_BACKOFF_MS = 5 * 60 * 1000;
const googleApiBackoffState = globalThis.__pharmapathGoogleApiBackoffState || {
  until: 0,
  code: null,
  message: null,
};

if (!globalThis.__pharmapathGoogleApiBackoffState) {
  globalThis.__pharmapathGoogleApiBackoffState = googleApiBackoffState;
}

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getGoogleApiKey() {
  return sanitizeText(process.env[GOOGLE_API_KEY_ENV_NAME]) || null;
}

function getRuntimeName() {
  if (sanitizeText(process.env.VERCEL)) {
    return "vercel";
  }

  return "node";
}

function getGoogleApiRuntimeMetadata() {
  return {
    runtime: getRuntimeName(),
    nodeEnv: sanitizeText(process.env.NODE_ENV) || null,
    vercelEnv: sanitizeText(process.env.VERCEL_ENV) || null,
    hasGoogleApiKey: Boolean(getGoogleApiKey()),
    googleApiBackoffActive: Boolean(getGoogleApiBackoffState()),
  };
}

function createGoogleApiUnavailablePayload(error) {
  return {
    error,
    code: MISSING_GOOGLE_API_KEY_CODE,
  };
}

function logGoogleApiConfigurationError(scope, metadata = {}) {
  console.error(`[${scope}] missing GOOGLE_API_KEY`, {
    ...getGoogleApiRuntimeMetadata(),
    code: MISSING_GOOGLE_API_KEY_CODE,
    ...metadata,
  });
}

function summarizeGoogleApiError(error) {
  return {
    code: sanitizeText(error?.code) || null,
    message: sanitizeText(error?.message) || null,
    statusCode: typeof error?.statusCode === "number" ? error.statusCode : null,
  };
}

function clearGoogleApiBackoff() {
  googleApiBackoffState.until = 0;
  googleApiBackoffState.code = null;
  googleApiBackoffState.message = null;
}

function getGoogleApiBackoffState() {
  if (!googleApiBackoffState.until || googleApiBackoffState.until <= Date.now()) {
    clearGoogleApiBackoff();
    return null;
  }

  return {
    until: googleApiBackoffState.until,
    code: googleApiBackoffState.code,
    message: googleApiBackoffState.message,
    retryAfterSeconds: Math.max(1, Math.ceil((googleApiBackoffState.until - Date.now()) / 1000)),
  };
}

function activateGoogleApiBackoff({
  code,
  message,
  durationMs = GOOGLE_API_QUOTA_BACKOFF_MS,
} = {}) {
  const normalizedDurationMs = Math.max(1_000, Number(durationMs) || GOOGLE_API_QUOTA_BACKOFF_MS);

  googleApiBackoffState.until = Date.now() + normalizedDurationMs;
  googleApiBackoffState.code = sanitizeText(code) || "google_api_backoff";
  googleApiBackoffState.message =
    sanitizeText(message) || "Location service is temporarily unavailable.";

  return getGoogleApiBackoffState();
}

function logGoogleApiRequestError(scope, error, metadata = {}) {
  console.error(`[${scope}] location service failure`, {
    ...getGoogleApiRuntimeMetadata(),
    ...summarizeGoogleApiError(error),
    ...metadata,
  });
}

module.exports = {
  GOOGLE_API_QUOTA_BACKOFF_MS,
  GOOGLE_API_REQUEST_DENIED_BACKOFF_MS,
  MISSING_GOOGLE_API_KEY_CODE,
  activateGoogleApiBackoff,
  clearGoogleApiBackoff,
  createGoogleApiUnavailablePayload,
  getGoogleApiBackoffState,
  getGoogleApiKey,
  getGoogleApiRuntimeMetadata,
  logGoogleApiConfigurationError,
  logGoogleApiRequestError,
};
