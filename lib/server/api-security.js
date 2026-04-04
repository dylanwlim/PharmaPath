"use strict";

const RATE_LIMIT_BUCKETS =
  globalThis.__pharmapathRateLimitBuckets || new Map();

if (!globalThis.__pharmapathRateLimitBuckets) {
  globalThis.__pharmapathRateLimitBuckets = RATE_LIMIT_BUCKETS;
}

function sanitizeText(value, limit = 256) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeStatusCode(value, fallback = 500) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 400 || numericValue > 599) {
    return fallback;
  }

  return numericValue;
}

function readClientAddress(request) {
  const forwarded =
    request.headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((part) => part.trim())
      .find(Boolean) || "";

  return (
    sanitizeText(request.headers.get("cf-connecting-ip"), 128) ||
    sanitizeText(forwarded, 128) ||
    sanitizeText(request.headers.get("x-real-ip"), 128) ||
    null
  );
}

function originMatchesRequest(request) {
  const originHeader = request.headers.get("origin");

  if (!originHeader) {
    return true;
  }

  try {
    const originUrl = new URL(originHeader);
    const requestUrl = new URL(request.url);
    const protocol =
      sanitizeText(request.headers.get("x-forwarded-proto"), 16) ||
      requestUrl.protocol.replace(/:$/, "");
    const host =
      sanitizeText(request.headers.get("x-forwarded-host"), 255) ||
      sanitizeText(request.headers.get("host"), 255) ||
      requestUrl.host;

    return originUrl.protocol === `${protocol}:` && originUrl.host === host;
  } catch {
    return false;
  }
}

function validatePublicJsonPostRequest(request) {
  if (request.method !== "POST") {
    return null;
  }

  if (!originMatchesRequest(request)) {
    return {
      statusCode: 403,
      message: "Cross-site requests are not allowed.",
    };
  }

  const contentType = sanitizeText(request.headers.get("content-type"), 120).toLowerCase();

  if (!contentType || !contentType.includes("application/json")) {
    return {
      statusCode: 415,
      message: "Content-Type must be application/json.",
    };
  }

  return null;
}

function cleanupExpiredBuckets(now) {
  for (const [key, entry] of RATE_LIMIT_BUCKETS.entries()) {
    if (entry.resetAt <= now) {
      RATE_LIMIT_BUCKETS.delete(key);
    }
  }
}

function buildRateLimitKey(bucket, key) {
  return `${bucket}:${key}`;
}

function consumeRateLimit({ bucket, key, limit, windowMs }) {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const normalizedBucket = sanitizeText(bucket, 120) || "default";
  const normalizedKey = sanitizeText(key, 256) || "anonymous";
  const normalizedLimit = Math.max(1, Math.round(Number(limit) || 1));
  const normalizedWindowMs = Math.max(1000, Math.round(Number(windowMs) || 1000));
  const bucketKey = buildRateLimitKey(normalizedBucket, normalizedKey);
  const activeEntry = RATE_LIMIT_BUCKETS.get(bucketKey);

  if (!activeEntry) {
    const nextEntry = {
      count: 1,
      resetAt: now + normalizedWindowMs,
    };

    RATE_LIMIT_BUCKETS.set(bucketKey, nextEntry);

    return {
      allowed: true,
      limit: normalizedLimit,
      remaining: Math.max(normalizedLimit - nextEntry.count, 0),
      resetAt: nextEntry.resetAt,
      retryAfterSeconds: 0,
    };
  }

  activeEntry.count += 1;
  RATE_LIMIT_BUCKETS.set(bucketKey, activeEntry);

  const allowed = activeEntry.count <= normalizedLimit;
  const retryAfterSeconds = allowed
    ? 0
    : Math.max(1, Math.ceil((activeEntry.resetAt - now) / 1000));

  return {
    allowed,
    limit: normalizedLimit,
    remaining: allowed ? Math.max(normalizedLimit - activeEntry.count, 0) : 0,
    resetAt: activeEntry.resetAt,
    retryAfterSeconds,
  };
}

function consumeRateLimitByIp(request, options) {
  const userAgent = sanitizeText(request.headers.get("user-agent"), 80) || "unknown-agent";
  const clientKey = readClientAddress(request) || `anonymous:${userAgent}`;

  return consumeRateLimit({
    ...options,
    key: clientKey,
  });
}

function buildRateLimitHeaders(rateLimitResult) {
  return {
    "X-RateLimit-Limit": String(rateLimitResult.limit),
    "X-RateLimit-Remaining": String(rateLimitResult.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateLimitResult.resetAt / 1000)),
  };
}

function summarizeError(error) {
  if (!error || typeof error !== "object") {
    return {
      name: null,
      code: null,
      statusCode: null,
      message: "Unknown error",
    };
  }

  return {
    name: typeof error.name === "string" ? sanitizeText(error.name, 80) : null,
    code: typeof error.code === "string" ? sanitizeText(error.code, 80) : null,
    statusCode:
      typeof error.statusCode === "number"
        ? normalizeStatusCode(error.statusCode, error.statusCode)
        : typeof error.status === "number"
          ? normalizeStatusCode(error.status, error.status)
          : null,
    message:
      typeof error.message === "string" ? sanitizeText(error.message, 240) : "Unknown error",
  };
}

function toPublicError(error, fallbackMessage) {
  const summary = summarizeError(error);
  const statusCode = normalizeStatusCode(summary.statusCode, 500);

  if (statusCode >= 400 && statusCode < 500 && summary.message) {
    return {
      statusCode,
      message: summary.message,
    };
  }

  return {
    statusCode,
    message: fallbackMessage,
  };
}

function logApiFailure(scope, error, metadata = {}) {
  console.error(`[${scope}] request failed`, {
    ...summarizeError(error),
    ...metadata,
  });
}

module.exports = {
  buildRateLimitHeaders,
  consumeRateLimit,
  consumeRateLimitByIp,
  logApiFailure,
  originMatchesRequest,
  readClientAddress,
  summarizeError,
  toPublicError,
  validatePublicJsonPostRequest,
};
