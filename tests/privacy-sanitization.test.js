"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hasSensitiveContactData,
  sanitizePrivateCrowdReportNote,
  sanitizePublicContributorAlias,
} = require("../lib/security/privacy");

test("private crowd report notes redact contact details and prescription references", () => {
  const sanitized = sanitizePrivateCrowdReportNote(
    "Call me at (718) 555-1234 or email matt@example.com. Rx #A12345 is on file. https://example.com",
  );

  assert.equal(
    sanitized,
    "Call me at [redacted phone] or email [redacted email]. [redacted prescription reference] is on file. [redacted link]",
  );
});

test("public contributor aliases drop contact-like content and fall back safely", () => {
  assert.equal(
    sanitizePublicContributorAlias("matt@example.com", "Matthew"),
    "Matthew",
  );
  assert.equal(
    sanitizePublicContributorAlias("Matthew | https://example.com", "Matthew"),
    "Matthew",
  );
});

test("sensitive contact detection catches common privacy leaks", () => {
  assert.equal(hasSensitiveContactData("text me at 917-555-0100"), true);
  assert.equal(hasSensitiveContactData("reach me at matt@example.com"), true);
  assert.equal(hasSensitiveContactData("plain inventory note"), false);
});
