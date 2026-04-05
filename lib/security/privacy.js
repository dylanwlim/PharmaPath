"use strict";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+\b/gi;
const PHONE_PATTERN =
  /(?<!\w)(?:\+?1[\s.-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}(?!\w)/g;
const PRESCRIPTION_REFERENCE_PATTERN =
  /\b(?:rx|script|prescription)\s*#?\s*[A-Z0-9-]{4,}\b/gi;

function normalizeSingleLine(value, limit = 80) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, limit)
    : "";
}

function normalizeMultiline(value, limit = 240) {
  return typeof value === "string"
    ? value
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .trim()
        .slice(0, limit)
    : "";
}

function hasSensitiveContactData(value) {
  const normalizedValue = typeof value === "string" ? value : "";

  return (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(normalizedValue) ||
    /\b(?:https?:\/\/|www\.)\S+\b/i.test(normalizedValue) ||
    /(?<!\w)(?:\+?1[\s.-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}(?!\w)/.test(
      normalizedValue,
    ) ||
    /\b(?:rx|script|prescription)\s*#?\s*[A-Z0-9-]{4,}\b/i.test(normalizedValue)
  );
}

function sanitizePublicContributorAlias(value, fallback = "PharmaPath Contributor", limit = 80) {
  const safeFallback = normalizeSingleLine(fallback, limit) || "PharmaPath Contributor";
  const normalizedValue = normalizeSingleLine(value, limit * 2);

  if (!normalizedValue) {
    return safeFallback;
  }

  const sanitizedValue = normalizedValue
    .replace(EMAIL_PATTERN, " ")
    .replace(URL_PATTERN, " ")
    .replace(PHONE_PATTERN, " ")
    .replace(/[^a-z0-9 .,'_-]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);

  return sanitizedValue || safeFallback;
}

function sanitizePrivateCrowdReportNote(value, { limit = 240 } = {}) {
  const normalizedValue = normalizeMultiline(value, limit * 2);

  return normalizedValue
    .replace(URL_PATTERN, "[redacted link]")
    .replace(EMAIL_PATTERN, "[redacted email]")
    .replace(PHONE_PATTERN, "[redacted phone]")
    .replace(PRESCRIPTION_REFERENCE_PATTERN, "[redacted prescription reference]")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, limit);
}

module.exports = {
  hasSensitiveContactData,
  sanitizePrivateCrowdReportNote,
  sanitizePublicContributorAlias,
};
