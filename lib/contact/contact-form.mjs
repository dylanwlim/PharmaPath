export const CONTACT_FALLBACK_EMAIL = "contact@pharmapath.org";

export const CONTACT_CATEGORY_OPTIONS = [
  {
    value: "Bug report",
    description: "Broken pages, search issues, login trouble, or anything else that is not working the way it should.",
    messageHint:
      "Include the page or feature, what you clicked, what happened, and what you expected instead.",
    messagePlaceholder:
      "What happened? Include the page or feature, what you did, what went wrong, and what you expected instead.",
    submitLabel: "Send report",
    emailSubject: "Bug report",
  },
  {
    value: "Feedback or suggestion",
    description: "Ideas, friction points, or anything that would make PharmaPath easier to use.",
    messageHint:
      "Tell us what felt confusing, slow, or missing, and what would make the experience better.",
    messagePlaceholder:
      "What should we improve? Share what felt confusing, what you expected, and what would make this more useful.",
    submitLabel: "Send feedback",
    emailSubject: "Feedback",
  },
  {
    value: "Data issue or correction",
    description: "Wrong or incomplete pharmacy details, medication details, strengths, or location information.",
    messageHint:
      "Include the pharmacy, medication, strength, and location if you have them, plus what looks wrong.",
    messagePlaceholder:
      "What looks incorrect? Include the pharmacy, medication, strength, and location if you have them.",
    submitLabel: "Send report",
    emailSubject: "Data issue",
  },
  {
    value: "Partnership or press",
    description: "Partnership questions, research outreach, or media requests.",
    messageHint:
      "Share your organization, what you need, and any relevant deadline or timeline.",
    messagePlaceholder:
      "Tell us who you are, what you need, and any deadline or timeline that matters.",
    submitLabel: "Send message",
    emailSubject: "Partnership or press",
  },
  {
    value: "Other",
    description: "Anything else that does not fit the categories above.",
    messageHint:
      "Share enough context for us to understand the issue or route your note correctly.",
    messagePlaceholder:
      "Tell us what you need help with and include any detail that would help us understand it quickly.",
    submitLabel: "Send message",
    emailSubject: "Other",
  },
];

export const CONTACT_CATEGORY_VALUES = CONTACT_CATEGORY_OPTIONS.map((option) => option.value);

export const CONTACT_FIELD_LIMITS = {
  name: 80,
  email: 320,
  category: 120,
  message: 4000,
  website: 200,
  turnstileToken: 2048,
};

export const CONTACT_MIN_MESSAGE_LENGTH = 20;

export function createEmptyContactDraft() {
  return {
    name: "",
    email: "",
    category: "",
    message: "",
    website: "",
    turnstileToken: "",
  };
}

export function getContactCategoryOption(value) {
  return CONTACT_CATEGORY_OPTIONS.find((option) => option.value === value) ?? null;
}

export function sanitizeSingleLine(value, limit = 256) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

export function sanitizeMultiline(value, limit = CONTACT_FIELD_LIMITS.message) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\r\n/g, "\n").trim().slice(0, limit);
}

export function normalizeEmail(value) {
  return sanitizeSingleLine(value, CONTACT_FIELD_LIMITS.email).toLowerCase();
}

export function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeContactPayload(value) {
  const candidate = typeof value === "object" && value !== null ? value : {};

  return {
    name: sanitizeSingleLine(candidate.name, CONTACT_FIELD_LIMITS.name),
    email: normalizeEmail(candidate.email),
    category: sanitizeSingleLine(
      candidate.category ?? candidate.subject,
      CONTACT_FIELD_LIMITS.category,
    ),
    message: sanitizeMultiline(candidate.message, CONTACT_FIELD_LIMITS.message),
    website: sanitizeSingleLine(candidate.website, CONTACT_FIELD_LIMITS.website),
    turnstileToken: sanitizeSingleLine(
      candidate.turnstileToken,
      CONTACT_FIELD_LIMITS.turnstileToken,
    ),
  };
}

export function validateContactPayload(payload, options = {}) {
  const requireTurnstile = Boolean(options.requireTurnstile);
  const fieldErrors = {};

  if (!payload.name) {
    fieldErrors.name = "Please enter your name.";
  }

  if (!payload.email) {
    fieldErrors.email = "Please enter your email address.";
  } else if (!looksLikeEmail(payload.email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!payload.category) {
    fieldErrors.category = "Choose a category.";
  } else if (!CONTACT_CATEGORY_VALUES.includes(payload.category)) {
    fieldErrors.category = "Choose a valid category.";
  }

  if (!payload.message) {
    fieldErrors.message = "Please enter a message.";
  } else if (payload.message.length < CONTACT_MIN_MESSAGE_LENGTH) {
    fieldErrors.message =
      `Message must be at least ${CONTACT_MIN_MESSAGE_LENGTH} characters.`;
  }

  if (requireTurnstile && !payload.turnstileToken) {
    fieldErrors.turnstileToken = "Please complete the verification step.";
  }

  return fieldErrors;
}
