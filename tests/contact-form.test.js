"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadContactModules() {
  const contactModule = await import(
    pathToFileURL(path.resolve(__dirname, "../lib/contact/contact-form.mjs")).href
  );
  const deliveryModule = await import(
    pathToFileURL(path.resolve(__dirname, "../lib/server/contact-delivery.mjs")).href
  );

  return {
    ...contactModule,
    ...deliveryModule,
  };
}

test("normalizeContactPayload trims fields and accepts the legacy subject key", async () => {
  const { normalizeContactPayload } = await loadContactModules();
  const payload = normalizeContactPayload({
    name: "  Jane   Example  ",
    email: "  Jane@Example.COM ",
    subject: "  Bug report ",
    message: "  First line.\r\nSecond line.  ",
  });

  assert.deepEqual(payload, {
    name: "Jane Example",
    email: "jane@example.com",
    category: "Bug report",
    message: "First line.\nSecond line.",
    website: "",
    turnstileToken: "",
  });
});

test("validateContactPayload returns inline-friendly field errors", async () => {
  const {
    CONTACT_MIN_MESSAGE_LENGTH,
    validateContactPayload,
  } = await loadContactModules();
  const errors = validateContactPayload(
    {
      name: "",
      email: "bad-email",
      category: "",
      message: "too short",
      website: "",
      turnstileToken: "",
    },
    { requireTurnstile: true }
  );

  assert.deepEqual(errors, {
    name: "Please enter your name.",
    email: "Enter a valid email address.",
    category: "Choose a category.",
    message: `Message must be at least ${CONTACT_MIN_MESSAGE_LENGTH} characters.`,
    turnstileToken: "Please complete the verification step.",
  });
});

test("contact runtime config reports missing delivery env vars", async () => {
  const {
    CONTACT_FALLBACK_EMAIL,
    getContactRuntimeConfig,
    getMissingContactEnvVars,
  } = await loadContactModules();
  const config = getContactRuntimeConfig({});

  assert.equal(config.deliveryInbox, CONTACT_FALLBACK_EMAIL);
  assert.equal(config.turnstileEnabled, false);
  assert.deepEqual(getMissingContactEnvVars(config), [
    "RESEND_API_KEY",
    "CONTACT_EMAIL",
    "CONTACT_FROM_EMAIL",
  ]);
});

test("contact email rendering escapes HTML-sensitive user input", async () => {
  const {
    buildContactEmailSubject,
    buildContactHtmlBody,
    buildContactTextBody,
  } = await loadContactModules();
  const submission = {
    name: "<Jane>",
    email: "jane@example.com",
    category: "Feedback or suggestion",
    message: "Need <strong>clearer</strong> status text.",
  };

  const subject = buildContactEmailSubject(submission);
  const html = buildContactHtmlBody(submission);
  const text = buildContactTextBody(submission);

  assert.equal(subject, "[PharmaPath] Feedback");
  assert.match(html, /&lt;Jane&gt;/);
  assert.match(html, /&lt;strong&gt;clearer&lt;\/strong&gt;/);
  assert.match(html, /Sender/);
  assert.match(text, /PharmaPath contact submission/);
  assert.match(text, /Category: Feedback/);
  assert.match(text, /Need <strong>clearer<\/strong> status text\./);
});
