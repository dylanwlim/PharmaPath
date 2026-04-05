"use client";

import { type FormEvent, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  Send,
} from "lucide-react";
import { TurnstileWidget } from "@/components/contact/turnstile-widget";
import { PageTransitionShell } from "@/components/page-transition-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import {
  CONTACT_CATEGORY_OPTIONS,
  CONTACT_FALLBACK_EMAIL,
  CONTACT_FIELD_LIMITS,
  createEmptyContactDraft,
  getContactCategoryOption,
  validateContactPayload,
} from "@/lib/contact/contact-form.mjs";
import { cn } from "@/lib/utils";

type ContactField = "name" | "email" | "category" | "message" | "turnstileToken";

type ContactDraft = {
  name: string;
  email: string;
  category: string;
  message: string;
  website: string;
  turnstileToken: string;
};

type ContactReply = {
  error?: string;
  fallbackEmail?: string;
  fieldErrors?: Partial<Record<ContactField, string>>;
  status?: "ok";
};

type SubmissionState = "idle" | "submitting" | "sent";
type FeedbackTone = "error" | "success";

type ContactCategoryOption = {
  description: string;
  messagePlaceholder?: string;
  submitLabel?: string;
  value: string;
};

const emptyDraft = createEmptyContactDraft() as ContactDraft;
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
const helpfulDetails = [
  {
    label: "Bug report",
    text: "include the page, what you clicked, what happened, and what you expected.",
  },
  {
    label: "Data issue",
    text: "include the pharmacy, medication, strength, and location if you have them.",
  },
  {
    label: "Feedback",
    text: "tell us what felt confusing or what would make the experience better.",
  },
];
const defaultCategoryDescription = "Choose the category that best matches what you're sending.";
const defaultMessagePlaceholder =
  "What happened? Include the page or feature, what you did, what went wrong, and what you expected instead.";
const controlIds: Record<ContactField, string> = {
  name: "contact-name",
  email: "contact-email",
  category: "contact-category",
  message: "contact-message",
  turnstileToken: "contact-turnstile",
};

function getValidationErrors(draft: ContactDraft) {
  return validateContactPayload(draft, {
    requireTurnstile: Boolean(turnstileSiteKey),
  }) as Partial<Record<ContactField, string>>;
}

function focusFirstInvalidField(errors: Partial<Record<ContactField, string>>) {
  const firstInvalidField = (Object.keys(controlIds) as ContactField[]).find((field) => errors[field]);

  if (!firstInvalidField) {
    return;
  }

  const element = document.getElementById(controlIds[firstInvalidField]);
  element?.focus();
}

export default function ContactPage() {
  const [draft, setDraft] = useState<ContactDraft>({ ...emptyDraft });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: FeedbackTone;
  } | null>(null);
  const [manualFallbackEmail, setManualFallbackEmail] = useState(CONTACT_FALLBACK_EMAIL as string);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const fieldLabelClass =
    "mb-2.5 inline-flex items-center text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-slate-800";
  const selectedCategoryOption = getContactCategoryOption(draft.category) as ContactCategoryOption | null;
  const categoryDescription = selectedCategoryOption?.description ?? defaultCategoryDescription;
  const messagePlaceholder = selectedCategoryOption?.messagePlaceholder ?? defaultMessagePlaceholder;
  const submitLabel = selectedCategoryOption?.submitLabel ?? "Send report";

  function setField(field: keyof ContactDraft, value: string) {
    setDraft((previous) => {
      const nextDraft = {
        ...previous,
        [field]: value,
      };

      if (field in controlIds && fieldErrors[field as ContactField]) {
        const nextErrors = getValidationErrors(nextDraft);
        setFieldErrors((previousErrors) => {
          const updatedErrors = { ...previousErrors };
          const nextFieldError = nextErrors[field as ContactField];

          if (nextFieldError) {
            updatedErrors[field as ContactField] = nextFieldError;
          } else {
            delete updatedErrors[field as ContactField];
          }

          return updatedErrors;
        });
      }

      return nextDraft;
    });

    if (submissionState !== "idle") {
      setSubmissionState("idle");
    }

    if (feedback) {
      setFeedback(null);
    }
  }

  function validateField(field: ContactField) {
    const nextErrors = getValidationErrors(draft);

    setFieldErrors((previousErrors) => {
      const updatedErrors = { ...previousErrors };
      const nextFieldError = nextErrors[field];

      if (nextFieldError) {
        updatedErrors[field] = nextFieldError;
      } else {
        delete updatedErrors[field];
      }

      return updatedErrors;
    });
  }

  function getFieldDescribedBy(field: ContactField, helperId?: string) {
    const ids = [];

    if (helperId) {
      ids.push(helperId);
    }

    if (fieldErrors[field]) {
      ids.push(`${controlIds[field]}-error`);
    }

    return ids.length > 0 ? ids.join(" ") : undefined;
  }

  async function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = getValidationErrors(draft);

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFeedback({
        tone: "error",
        message: "Please check the highlighted fields and try again.",
      });
      focusFirstInvalidField(nextErrors);
      return;
    }

    setSubmissionState("submitting");
    setFeedback(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      const payload = (await response.json()) as ContactReply;

      if (!response.ok) {
        setSubmissionState("idle");

        if (payload.fallbackEmail) {
          setManualFallbackEmail(payload.fallbackEmail);
        }

        if (payload.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
          focusFirstInvalidField(payload.fieldErrors);
        }

        if (payload.fieldErrors?.turnstileToken) {
          setTurnstileResetKey((value) => value + 1);
          setDraft((previous) => ({
            ...previous,
            turnstileToken: "",
          }));
        }

        setFeedback({
          tone: "error",
          message:
            payload.error ??
            "We couldn't send your message right now. Your details are still here, so you can try again.",
        });
        return;
      }

      setDraft({ ...emptyDraft });
      setFieldErrors({});
      setFeedback({
        tone: "success",
        message: "Your message was sent.",
      });
      setSubmissionState("sent");
      setTurnstileResetKey((value) => value + 1);
    } catch {
      setSubmissionState("idle");
      setFeedback({
        tone: "error",
        message: "We couldn't send your message. Your details are still here, so please try again.",
      });
    }
  }

  function resetForm() {
    setDraft({ ...emptyDraft });
    setFieldErrors({});
    setFeedback(null);
    setSubmissionState("idle");
    setTurnstileResetKey((value) => value + 1);
  }

  function getControlClass(field: ContactField, options?: { multiline?: boolean }) {
    return cn(
      "w-full rounded-[1.05rem] border border-slate-300 bg-white px-4 text-[1rem] leading-[1.5] text-slate-950 shadow-[0_1px_1px_rgba(15,23,42,0.03),0_10px_24px_rgba(15,23,42,0.045)] outline-none transition-[border-color,box-shadow,background-color,color] duration-150 placeholder:text-slate-500 hover:border-slate-400 focus:border-[#156d95] focus:ring-4 focus:ring-[#156d95]/12 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none",
      options?.multiline ? "min-h-[11rem] py-3.5" : "h-[3.35rem] py-3",
      fieldErrors[field] ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : null,
    );
  }

  return (
    <>
      <SiteNavbar />
      <PageTransitionShell>
        <main>
          <section className="px-4 pb-14 pt-[calc(var(--navbar-height)+0.9rem)] sm:px-6 sm:pb-16 sm:pt-[calc(var(--navbar-height)+1rem)] lg:px-8 lg:pb-20 lg:pt-[calc(var(--navbar-height)+1.15rem)]">
            <div className="site-shell">
              <div className="mx-auto max-w-[60rem]">
                <div className="surface-panel rounded-[2rem] p-6 sm:p-8 lg:p-9">
                  <div className="max-w-[38rem]">
                    <span className="eyebrow-label">REPORT AN ISSUE</span>
                    <h1 className="mt-4 text-[2.45rem] leading-[0.98] tracking-tight text-slate-950 sm:text-[2.9rem]">
                      Report a bug or share feedback
                    </h1>
                    <p className="mt-4 max-w-[35rem] text-[1rem] leading-7 text-slate-600 sm:text-[1.04rem]">
                      Found something broken, confusing, or incorrect? Send it here. We also review
                      product feedback and data corrections.
                    </p>
                    <p className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm leading-6 text-slate-700">
                      Not for emergencies or urgent medical questions.
                    </p>
                  </div>

                  <div className="mt-6 border-t border-slate-200/80 pt-6">
                    {submissionState === "sent" ? (
                      <div
                        className="rounded-[1.55rem] border border-emerald-200/90 bg-emerald-50/85 p-6 sm:p-7"
                        role="status"
                      >
                        <div className="flex items-start gap-4">
                          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-white text-emerald-600 shadow-[0_1px_1px_rgba(15,23,42,0.06)]">
                            <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
                          </span>
                          <div className="min-w-0">
                            <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                              Thanks. Your message was sent.
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              We&apos;ll review it and reply by email if we need more detail.
                            </p>
                          </div>
                        </div>

                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={resetForm}
                            className="action-button-secondary text-sm"
                          >
                            Send another message
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form
                        noValidate
                        onSubmit={(event) => void submitDraft(event)}
                        className="space-y-6"
                        aria-busy={submissionState === "submitting"}
                      >
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <label htmlFor={controlIds.name} className={fieldLabelClass}>
                              Name
                            </label>
                            <input
                              id={controlIds.name}
                              name="name"
                              type="text"
                              autoComplete="name"
                              maxLength={CONTACT_FIELD_LIMITS.name}
                              value={draft.name}
                              onBlur={() => validateField("name")}
                              onChange={(event) => setField("name", event.target.value)}
                              placeholder="Your name"
                              required
                              aria-invalid={Boolean(fieldErrors.name)}
                              aria-describedby={getFieldDescribedBy("name")}
                              disabled={submissionState === "submitting"}
                              className={getControlClass("name")}
                            />
                            {fieldErrors.name ? (
                              <p
                                id={`${controlIds.name}-error`}
                                className="mt-2 text-sm leading-6 text-rose-600"
                              >
                                {fieldErrors.name}
                              </p>
                            ) : null}
                          </div>

                          <div>
                            <label htmlFor={controlIds.email} className={fieldLabelClass}>
                              Email
                            </label>
                            <input
                              id={controlIds.email}
                              name="email"
                              type="email"
                              autoComplete="email"
                              maxLength={CONTACT_FIELD_LIMITS.email}
                              value={draft.email}
                              onBlur={() => validateField("email")}
                              onChange={(event) => setField("email", event.target.value)}
                              placeholder="you@example.com"
                              required
                              aria-invalid={Boolean(fieldErrors.email)}
                              aria-describedby={getFieldDescribedBy("email", `${controlIds.email}-helper`)}
                              disabled={submissionState === "submitting"}
                              className={getControlClass("email")}
                            />
                            <p
                              id={`${controlIds.email}-helper`}
                              className="mt-2 text-sm leading-6 text-slate-600"
                            >
                              We&apos;ll reply here if we need more detail.
                            </p>
                            {fieldErrors.email ? (
                              <p
                                id={`${controlIds.email}-error`}
                                className="mt-2 text-sm leading-6 text-rose-600"
                              >
                                {fieldErrors.email}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div>
                          <label htmlFor={controlIds.category} className={fieldLabelClass}>
                            Category
                          </label>
                          <div className="relative">
                            <select
                              id={controlIds.category}
                              name="category"
                              value={draft.category}
                              onBlur={() => validateField("category")}
                              onChange={(event) => setField("category", event.target.value)}
                              required
                              aria-invalid={Boolean(fieldErrors.category)}
                              aria-describedby={getFieldDescribedBy(
                                "category",
                                `${controlIds.category}-helper`,
                              )}
                              disabled={submissionState === "submitting"}
                              className={cn(
                                getControlClass("category"),
                                "appearance-none pr-12 text-left",
                                draft.category ? "text-slate-950" : "text-slate-500",
                              )}
                            >
                              <option value="" disabled>
                                Choose a category
                              </option>
                              {(CONTACT_CATEGORY_OPTIONS as ContactCategoryOption[]).map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.value}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                              strokeWidth={1.8}
                            />
                          </div>
                          <p
                            id={`${controlIds.category}-helper`}
                            className="mt-2 text-sm leading-6 text-slate-600"
                          >
                            {categoryDescription}
                          </p>
                          {fieldErrors.category ? (
                            <p
                              id={`${controlIds.category}-error`}
                              className="mt-2 text-sm leading-6 text-rose-600"
                            >
                              {fieldErrors.category}
                            </p>
                          ) : null}
                        </div>

                        <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                          <label htmlFor="contact-website">Website</label>
                          <input
                            id="contact-website"
                            name="website"
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            value={draft.website}
                            onChange={(event) => setField("website", event.target.value)}
                          />
                        </div>

                        <div>
                          <label htmlFor={controlIds.message} className={fieldLabelClass}>
                            Message
                          </label>
                          <textarea
                            id={controlIds.message}
                            name="message"
                            maxLength={CONTACT_FIELD_LIMITS.message}
                            value={draft.message}
                            onBlur={() => validateField("message")}
                            onChange={(event) => setField("message", event.target.value)}
                            placeholder={messagePlaceholder}
                            required
                            aria-invalid={Boolean(fieldErrors.message)}
                            aria-describedby={getFieldDescribedBy("message")}
                            disabled={submissionState === "submitting"}
                            className={cn(getControlClass("message", { multiline: true }), "resize-y")}
                          />
                          {fieldErrors.message ? (
                            <p
                              id={`${controlIds.message}-error`}
                              className="mt-2 text-sm leading-6 text-rose-600"
                            >
                              {fieldErrors.message}
                            </p>
                          ) : null}
                        </div>

                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/85 px-4 py-4 sm:px-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                            Helpful details
                          </p>
                          <ul className="mt-3 space-y-2.5">
                            {helpfulDetails.map((detail) => (
                              <li key={detail.label} className="text-sm leading-6 text-slate-700">
                                <span className="font-semibold text-slate-900">{detail.label}:</span>{" "}
                                {detail.text}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {turnstileSiteKey ? (
                          <div id={controlIds.turnstileToken}>
                            <TurnstileWidget
                              siteKey={turnstileSiteKey}
                              resetKey={turnstileResetKey}
                              error={fieldErrors.turnstileToken}
                              onTokenChange={(token) => setField("turnstileToken", token)}
                            />
                          </div>
                        ) : null}

                        {feedback ? (
                          <div
                            className={cn(
                              "flex items-start gap-3 rounded-[1.2rem] border px-4 py-3.5",
                              feedback.tone === "error"
                                ? "border-rose-200 bg-rose-50/90"
                                : "border-emerald-200 bg-emerald-50/85",
                            )}
                            role={feedback.tone === "error" ? "alert" : "status"}
                            aria-live={feedback.tone === "error" ? "assertive" : "polite"}
                          >
                            {feedback.tone === "error" ? (
                              <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-rose-500" />
                            ) : (
                              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                            )}
                            <p
                              className={cn(
                                "text-sm leading-6",
                                feedback.tone === "error" ? "text-rose-700" : "text-emerald-800",
                              )}
                            >
                              {feedback.message}
                            </p>
                          </div>
                        ) : null}

                        <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm leading-6 text-slate-600">
                            Prefer email?{" "}
                            <a
                              href={`mailto:${manualFallbackEmail}`}
                              className="font-medium text-slate-900 underline underline-offset-4"
                            >
                              {manualFallbackEmail}
                            </a>
                          </p>

                          <button
                            type="submit"
                            disabled={submissionState === "submitting"}
                            className="action-button-primary inline-flex min-w-[11.5rem] items-center justify-center gap-2 self-start text-sm disabled:translate-y-0 disabled:scale-100 disabled:opacity-60 sm:self-auto"
                          >
                            {submissionState === "submitting" ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                            ) : (
                              <Send className="h-4 w-4" strokeWidth={1.75} />
                            )}
                            {submissionState === "submitting" ? "Sending..." : submitLabel}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </PageTransitionShell>
      <SiteFooter />
    </>
  );
}
