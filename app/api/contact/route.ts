import { createRequire } from "node:module";
import { NextResponse } from "next/server";
import {
  normalizeContactPayload,
  validateContactPayload,
} from "@/lib/contact/contact-form.mjs";
import {
  getContactRuntimeConfig,
  getMissingContactEnvVars,
  sendContactEmail,
  verifyTurnstileToken,
} from "@/lib/server/contact-delivery.mjs";

const require = createRequire(import.meta.url);
const {
  buildRateLimitHeaders,
  consumeRateLimitByIp,
  readClientAddress,
  summarizeError,
  validatePublicJsonPostRequest,
} = require("../../../lib/server/api-security");

type ContactApiResponse = {
  error?: string;
  fallbackEmail?: string;
  fieldErrors?: Record<string, string>;
  status?: "ok";
};

function jsonResponse(
  body: ContactApiResponse,
  status: number,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(body, { status, headers });
}

export async function POST(request: Request) {
  try {
    const requestPolicyError = validatePublicJsonPostRequest(request);

    if (requestPolicyError) {
      return jsonResponse(
        { error: requestPolicyError.message },
        requestPolicyError.statusCode,
      );
    }

    const rateLimit = consumeRateLimitByIp(request, {
      bucket: "contact-submit",
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });

    const rateLimitHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: "Too many contact submissions. Please try again shortly." },
        429,
        {
          ...rateLimitHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      );
    }

    let rawBody: unknown;

    try {
      rawBody = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid request body." }, 400, rateLimitHeaders);
    }

    const payload = normalizeContactPayload(rawBody);
    const config = getContactRuntimeConfig(process.env);
    const missingConfig = getMissingContactEnvVars(config);

    if (payload.website) {
      return jsonResponse(
        { error: "Unable to process that submission." },
        400,
        rateLimitHeaders,
      );
    }

    const fieldErrors = validateContactPayload(payload, {
      requireTurnstile: config.turnstileEnabled,
    }) as unknown as Record<string, string>;

    if (Object.keys(fieldErrors).length > 0) {
      return jsonResponse(
        {
          error: "Please correct the highlighted fields.",
          fieldErrors,
        },
        400,
        rateLimitHeaders,
      );
    }

    if (missingConfig.length > 0) {
      return jsonResponse(
        {
          error:
            "The contact form is temporarily unavailable. Please use the email fallback link instead.",
          fallbackEmail: config.deliveryInbox,
        },
        503,
        rateLimitHeaders,
      );
    }

    if (config.turnstileEnabled) {
      const verification = await verifyTurnstileToken({
        token: payload.turnstileToken,
        ipAddress: readClientAddress(request),
        secretKey: config.turnstileSecretKey,
      });

      if (!verification.success) {
        return jsonResponse(
          {
            error: "Verification failed. Please try again.",
            fieldErrors: {
              turnstileToken: "Please retry the verification step.",
            },
          },
          400,
          rateLimitHeaders,
        );
      }
    }

    await sendContactEmail(payload, config);

    return jsonResponse(
      { status: "ok" },
      200,
      rateLimitHeaders,
    );
  } catch (error) {
    console.error("[contact] send error", summarizeError(error));
    return jsonResponse(
      { error: "Failed to send message. Please try again." },
      500,
    );
  }
}
