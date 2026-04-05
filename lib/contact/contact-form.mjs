export const CONTACT_FALLBACK_EMAIL = "contact@pharmapath.org";

export const CONTACT_CATEGORY_OPTIONS = [
  {
    value: "Bug or broken flow",
    description: "Broken pages, search issues, login trouble, or anything that is not working as expected.",
  },
  {
    value: "Data issue",
    description: "Pharmacy details, medication context, or other information that looks incomplete or incorrect.",
  },
  {
    value: "Feature request",
    description: "Ideas that would make PharmaPath clearer, faster, or more useful.",
  },
  {
    value: "Partnership or press",
    description: "Partnership questions, research outreach, media requests, or similar external inquiries.",
  },
  {
    value: "Other",
    description: "Anything else that does not fit the categories above.",
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
    fieldErrors.category = "Choose the closest category.";
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
