import { createRequire } from "node:module";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const require = createRequire(import.meta.url);
const {
  buildRateLimitHeaders,
  consumeRateLimitByIp,
  summarizeError,
  validatePublicJsonPostRequest,
} = require("../../../lib/server/api-security");

const deliveryInbox = process.env.CONTACT_EMAIL?.trim() || "contact@pharmapath.org";
const deliveryFromAddress =
  process.env.CONTACT_FROM_EMAIL?.trim() || "PharmaPath Contact <onboarding@resend.dev>";

const fieldLimits = {
  name: 80,
  email: 320,
  subject: 140,
  message: 4000,
} as const;

type RawContactBody = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
};

type ContactSubmission = {
  senderName: string;
  senderEmail: string;
  subjectLine: string;
  messageBody: string;
};

function compressSingleLine(value: string, limit: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

function normalizeMultiline(value: string) {
  return value.replace(/\r\n/g, "\n").trim().slice(0, fieldLimits.message);
}

function escapeForHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function asRawContactBody(value: unknown): RawContactBody | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.name !== "string" ||
    typeof candidate.email !== "string" ||
    typeof candidate.subject !== "string" ||
    typeof candidate.message !== "string"
  ) {
    return null;
  }

  return candidate as RawContactBody;
}

function toSubmission(body: RawContactBody): ContactSubmission {
  return {
    senderName: compressSingleLine(body.name, fieldLimits.name),
    senderEmail: compressSingleLine(body.email, fieldLimits.email).toLowerCase(),
    subjectLine: compressSingleLine(body.subject, fieldLimits.subject),
    messageBody: normalizeMultiline(body.message),
  };
}

function validateSubmission(submission: ContactSubmission) {
  if (
    !submission.senderName ||
    !submission.senderEmail ||
    !submission.subjectLine ||
    !submission.messageBody
  ) {
    return "All fields are required.";
  }

  if (!looksLikeEmail(submission.senderEmail)) {
    return "Invalid email address.";
  }

  if (submission.messageBody.length < 10) {
    return "Message must be at least 10 characters.";
  }

  return null;
}

function renderHtmlEmail(submission: ContactSubmission) {
  return `
    <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto;">
      <h2 style="color: #156d95; margin-bottom: 12px;">New PharmaPath contact message</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 88px; vertical-align: top;"><strong>Name</strong></td>
          <td style="padding: 8px 0; color: #0f172a;">${escapeForHtml(submission.senderName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; vertical-align: top;"><strong>Email</strong></td>
          <td style="padding: 8px 0; color: #0f172a;">${escapeForHtml(submission.senderEmail)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; vertical-align: top;"><strong>Subject</strong></td>
          <td style="padding: 8px 0; color: #0f172a;">${escapeForHtml(submission.subjectLine)}</td>
        </tr>
      </table>
      <div style="border-radius: 12px; background: #f8fafc; padding: 16px; color: #0f172a; white-space: pre-wrap;">${escapeForHtml(submission.messageBody)}</div>
    </div>
  `;
}

async function deliverSubmission(submission: ContactSubmission) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: deliveryFromAddress,
    to: deliveryInbox,
    replyTo: submission.senderEmail,
    subject: `[PharmaPath Contact] ${submission.subjectLine}`,
    text: `Name: ${submission.senderName}\nEmail: ${submission.senderEmail}\nSubject: ${submission.subjectLine}\n\n${submission.messageBody}`,
    html: renderHtmlEmail(submission),
  });

  if (result.error || !result.data?.id) {
    throw result.error || new Error("Missing Resend message id");
  }
}

export async function POST(request: Request) {
  try {
    const requestPolicyError = validatePublicJsonPostRequest(request);

    if (requestPolicyError) {
      return NextResponse.json(
        { error: requestPolicyError.message },
        { status: requestPolicyError.statusCode },
      );
    }

    const rateLimit = consumeRateLimitByIp(request, {
      bucket: "contact-submit",
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many contact submissions. Please try again shortly." },
        {
          status: 429,
          headers: {
            ...buildRateLimitHeaders(rateLimit),
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const rawBody = asRawContactBody(await request.json());

    if (!rawBody) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (typeof rawBody.website === "string" && rawBody.website.trim()) {
      return NextResponse.json(
        { error: "Unable to process that submission." },
        { status: 400 },
      );
    }

    const submission = toSubmission(rawBody);
    const validationError = validateSubmission(submission);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          error: "Inline delivery is temporarily unavailable. Use the direct email fallback.",
          fallbackEmail: deliveryInbox,
          fallbackMode: "mailto",
        },
        {
          status: 503,
          headers: buildRateLimitHeaders(rateLimit),
        },
      );
    }

    await deliverSubmission(submission);
    return NextResponse.json(
      { status: "ok" },
      {
        headers: buildRateLimitHeaders(rateLimit),
      },
    );
  } catch (error) {
    console.error("[contact] send error", summarizeError(error));
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 },
    );
  }
}
