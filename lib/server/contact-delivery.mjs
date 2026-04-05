import { Resend } from "resend";
import { CONTACT_FALLBACK_EMAIL } from "../contact/contact-form.mjs";

function normalizeEnvValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getContactRuntimeConfig(env = process.env) {
  const configuredInbox = normalizeEnvValue(env.CONTACT_EMAIL);
  const configuredFromAddress = normalizeEnvValue(env.CONTACT_FROM_EMAIL);
  const resendApiKey = normalizeEnvValue(env.RESEND_API_KEY);
  const turnstileSiteKey = normalizeEnvValue(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const turnstileSecretKey = normalizeEnvValue(env.TURNSTILE_SECRET_KEY);

  return {
    configuredInbox,
    configuredFromAddress,
    resendApiKey,
    turnstileSiteKey,
    turnstileSecretKey,
    deliveryInbox: configuredInbox || CONTACT_FALLBACK_EMAIL,
    turnstileEnabled: Boolean(turnstileSiteKey && turnstileSecretKey),
  };
}

export function getMissingContactEnvVars(config) {
  const missing = [];

  if (!config.resendApiKey) {
    missing.push("RESEND_API_KEY");
  }

  if (!config.configuredInbox) {
    missing.push("CONTACT_EMAIL");
  }

  if (!config.configuredFromAddress) {
    missing.push("CONTACT_FROM_EMAIL");
  }

  if (config.turnstileSiteKey && !config.turnstileSecretKey) {
    missing.push("TURNSTILE_SECRET_KEY");
  }

  if (config.turnstileSecretKey && !config.turnstileSiteKey) {
    missing.push("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  }

  return missing;
}

function escapeForHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildContactTextBody(submission) {
  return [
    `Name: ${submission.name}`,
    `Email: ${submission.email}`,
    `Category: ${submission.category}`,
    "",
    submission.message,
  ].join("\n");
}

export function buildContactHtmlBody(submission) {
  return `
    <div style="font-family: 'Figtree', Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #0f172a;">
      <div style="border-radius: 24px; border: 1px solid #dbe4ec; background: #f8fbfd; padding: 24px;">
        <div style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #5b7488; margin-bottom: 12px;">
          PharmaPath contact message
        </div>
        <h1 style="font-size: 28px; line-height: 1.1; margin: 0 0 20px; color: #0f172a;">
          ${escapeForHtml(submission.category)}
        </h1>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 0 0 10px; width: 84px; color: #64748b; vertical-align: top;"><strong>Name</strong></td>
            <td style="padding: 0 0 10px; color: #0f172a;">${escapeForHtml(submission.name)}</td>
          </tr>
          <tr>
            <td style="padding: 0 0 10px; color: #64748b; vertical-align: top;"><strong>Email</strong></td>
            <td style="padding: 0 0 10px; color: #0f172a;">${escapeForHtml(submission.email)}</td>
          </tr>
          <tr>
            <td style="padding: 0; color: #64748b; vertical-align: top;"><strong>Category</strong></td>
            <td style="padding: 0; color: #0f172a;">${escapeForHtml(submission.category)}</td>
          </tr>
        </table>
        <div style="border-radius: 18px; border: 1px solid #dbe4ec; background: white; padding: 18px; color: #0f172a; white-space: pre-wrap; line-height: 1.65;">
          ${escapeForHtml(submission.message)}
        </div>
      </div>
    </div>
  `;
}

export async function verifyTurnstileToken({ token, ipAddress, secretKey }) {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
      ...(ipAddress ? { remoteip: ipAddress } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Turnstile verification failed with status ${response.status}`);
  }

  const payload = await response.json();

  return {
    success: Boolean(payload?.success),
    errorCodes: Array.isArray(payload?.["error-codes"]) ? payload["error-codes"] : [],
  };
}

export async function sendContactEmail(submission, config) {
  const resend = new Resend(config.resendApiKey);
  const result = await resend.emails.send({
    from: config.configuredFromAddress,
    to: config.deliveryInbox,
    replyTo: submission.email,
    subject: `[PharmaPath Contact] ${submission.category}`,
    text: buildContactTextBody(submission),
    html: buildContactHtmlBody(submission),
  });

  if (result.error || !result.data?.id) {
    throw result.error || new Error("Missing Resend message id");
  }

  return result.data.id;
}
