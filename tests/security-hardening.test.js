"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const {
  consumeRateLimit,
  toPublicError,
  validatePublicJsonPostRequest,
} = require("../lib/server/api-security");

test("public JSON POST validation allows same-origin requests with JSON bodies", () => {
  const request = new Request("https://www.pharmapath.org/api/contact", {
    method: "POST",
    headers: {
      origin: "https://www.pharmapath.org",
      "content-type": "application/json; charset=utf-8",
    },
    body: "{}",
  });

  assert.equal(validatePublicJsonPostRequest(request), null);
});

test("public JSON POST validation blocks cross-site and non-JSON requests", () => {
  const crossSiteRequest = new Request("https://www.pharmapath.org/api/contact", {
    method: "POST",
    headers: {
      origin: "https://attacker.example",
      "content-type": "application/json",
    },
    body: "{}",
  });
  const wrongContentTypeRequest = new Request("https://www.pharmapath.org/api/contact", {
    method: "POST",
    headers: {
      origin: "https://www.pharmapath.org",
      "content-type": "text/plain",
    },
    body: "name=test",
  });

  assert.deepEqual(validatePublicJsonPostRequest(crossSiteRequest), {
    statusCode: 403,
    message: "Cross-site requests are not allowed.",
  });
  assert.deepEqual(validatePublicJsonPostRequest(wrongContentTypeRequest), {
    statusCode: 415,
    message: "Content-Type must be application/json.",
  });
});

test("rate limiting blocks requests that exceed the configured bucket window", () => {
  const uniqueKey = `client-${Date.now()}-${Math.random()}`;
  const first = consumeRateLimit({
    bucket: "security-test",
    key: uniqueKey,
    limit: 2,
    windowMs: 60_000,
  });
  const second = consumeRateLimit({
    bucket: "security-test",
    key: uniqueKey,
    limit: 2,
    windowMs: 60_000,
  });
  const third = consumeRateLimit({
    bucket: "security-test",
    key: uniqueKey,
    limit: 2,
    windowMs: 60_000,
  });

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.ok(third.retryAfterSeconds >= 1);
});

test("public error serialization preserves validation errors but masks internal failures", () => {
  const badRequestError = new Error("Medication is required.");
  badRequestError.statusCode = 400;

  const internalError = new Error("connection reset by peer");
  internalError.statusCode = 502;

  assert.deepEqual(toPublicError(badRequestError, "Fallback"), {
    statusCode: 400,
    message: "Medication is required.",
  });
  assert.deepEqual(toPublicError(internalError, "Unable to load data right now."), {
    statusCode: 502,
    message: "Unable to load data right now.",
  });
});

test("next config enables core security headers and disables x-powered-by", async () => {
  const configModule = await import(
    pathToFileURL(path.resolve(__dirname, "../next.config.mjs")).href
  );
  const headers = await configModule.default.headers();
  const headerMap = new Map(headers[0].headers.map((entry) => [entry.key, entry.value]));

  assert.equal(configModule.default.poweredByHeader, false);
  assert.equal(headerMap.get("X-Frame-Options"), "DENY");
  assert.equal(headerMap.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headerMap.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(headerMap.get("Content-Security-Policy"), /frame-ancestors 'none'/);
  assert.match(headerMap.get("Content-Security-Policy"), /form-action 'self'/);
});
