"use client";

import { type FormEvent, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  Mail,
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

const emptyDraft = createEmptyContactDraft() as ContactDraft;
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
const helpfulDetails = [
  "For bugs, include the page, step, or action that broke.",
  "For data issues, include the pharmacy, medication, strength, and location if you have them.",
  "If you are asking about a partnership or press request, a short deadline or project summary helps.",
];
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
    "mb-2 inline-flex items-center text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-600";

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

  async function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = getValidationErrors(draft);

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFeedback({
        tone: "error",
        message: "Please correct the highlighted fields and try again.",
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
            "The message could not be sent right now. Please try again in a moment.",
        });
        return;
      }

      setDraft({ ...emptyDraft });
      setFieldErrors({});
      setFeedback({
        tone: "success",
        message: "Your message has been sent.",
      });
      setSubmissionState("sent");
      setTurnstileResetKey((value) => value + 1);
    } catch {
      setSubmissionState("idle");
      setFeedback({
        tone: "error",
        message: "Network error. Check your connection and try again.",
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
      "w-full rounded-[1.15rem] border border-slate-200/95 bg-white px-4 text-[0.98rem] leading-[1.5] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_1px_1px_rgba(15,23,42,0.02),0_8px_22px_rgba(15,23,42,0.035)] outline-none transition-[border-color,box-shadow,background-color,color] duration-150 placeholder:text-slate-400 focus:border-[#156d95] focus:ring-4 focus:ring-[#156d95]/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400",
      options?.multiline ? "min-h-[11.5rem] py-3.5" : "h-[3.3rem] py-3",
      fieldErrors[field] ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : null,
    );
  }

  return (
    <>
      <SiteNavbar />
      <PageTransitionShell>
        <main>
          <section className="px-4 pb-14 pt-[calc(var(--navbar-height)+1.35rem)] sm:px-6 sm:pb-16 sm:pt-[calc(var(--navbar-height)+1.55rem)] lg:px-8 lg:pb-20 lg:pt-[calc(var(--navbar-height)+1.7rem)]">
            <div className="site-shell">
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,22rem)] xl:items-start xl:gap-10">
                <div className="min-w-0">
                  <div className="max-w-[39rem]">
                    <span className="eyebrow-label">Contact</span>
                    <h1 className="mt-4 max-w-[30rem] text-[2.7rem] leading-[0.98] tracking-tight text-slate-950 sm:text-[3.05rem] lg:max-w-[32rem] lg:text-[3.18rem]">
                      Contact PharmaPath
                    </h1>
                    <p className="mt-4 max-w-[36rem] text-[1.02rem] leading-7 text-slate-600 sm:text-[1.05rem]">
                      Use this form to report a bug, flag a data issue, suggest a feature, or ask
                      about partnerships or press. Your message sends from this page and stays here
                      while it is being delivered.
                    </p>
                    <p className="mt-4 max-w-[34rem] rounded-full border border-slate-200/90 bg-white/80 px-4 py-2.5 text-sm leading-6 text-slate-600 shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
                      Do not use this form for urgent clinical questions or emergency care.
                    </p>
                  </div>

                  <div className="surface-panel mt-7 rounded-[2rem] p-6 sm:p-7 lg:mt-8 lg:p-8">
                    <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
                      <div className="max-w-[28rem]">
                        <span className="eyebrow-label">Send a message</span>
                        <h2 className="mt-3 text-[1.65rem] leading-tight tracking-tight text-slate-950">
                          Tell us what happened
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Clear details make it easier to review the right page, route the request,
                          and follow up if needed.
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/90 px-3.5 py-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4 text-[#156d95]" strokeWidth={1.75} />
                        On-site submission
                      </div>
                    </div>

                    {submissionState === "sent" ? (
                      <div className="py-10">
                        <div className="rounded-[1.7rem] border border-emerald-200/90 bg-emerald-50/85 p-6 sm:p-7">
                          <div className="flex items-start gap-4">
                            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-white text-emerald-600 shadow-[0_1px_1px_rgba(15,23,42,0.06)]">
                              <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
                            </span>
                            <div>
                              <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                                Thanks. Your message is on its way.
                              </h3>
                              <p className="mt-2 max-w-[32rem] text-sm leading-6 text-slate-600">
                                We received your note and kept the submission on site. If you want
                                to send another message, start a fresh form below.
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={resetForm}
                              className="action-button-secondary text-sm"
                            >
                              Send another message
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <form
                        noValidate
                        onSubmit={(event) => void submitDraft(event)}
                        className="mt-6 space-y-6"
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
                              aria-describedby={fieldErrors.name ? `${controlIds.name}-error` : undefined}
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
                              aria-describedby={fieldErrors.email ? `${controlIds.email}-error` : undefined}
                              disabled={submissionState === "submitting"}
                              className={getControlClass("email")}
                            />
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
                              aria-describedby={
                                fieldErrors.category ? `${controlIds.category}-error` : undefined
                              }
                              disabled={submissionState === "submitting"}
                              className={cn(
                                getControlClass("category"),
                                "appearance-none pr-12 text-left",
                              )}
                            >
                              <option value="" disabled>
                                Choose the closest fit
                              </option>
                              {(CONTACT_CATEGORY_OPTIONS as Array<{
                                description: string;
                                value: string;
                              }>).map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.value}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                              strokeWidth={1.8}
                            />
                          </div>
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
                            placeholder="Tell us what happened, where you saw it, and anything that would help us review it."
                            required
                            aria-invalid={Boolean(fieldErrors.message)}
                            aria-describedby={
                              fieldErrors.message ? `${controlIds.message}-error` : undefined
                            }
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
                              "flex items-start gap-3 rounded-[1.25rem] border px-4 py-3.5",
                              feedback.tone === "error"
                                ? "border-rose-200 bg-rose-50/85"
                                : "border-emerald-200 bg-emerald-50/80",
                            )}
                            role={feedback.tone === "error" ? "alert" : "status"}
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

                        <div className="rounded-[1.55rem] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.92))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] sm:px-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="max-w-[30rem]">
                              <p className="text-sm font-medium text-slate-700">
                                Use this form for product, data, partnership, and press questions.
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-500">
                                The message stays on this page while it sends. If delivery is ever
                                unavailable, use the manual fallback link in the sidebar.
                              </p>
                            </div>

                            <button
                              type="submit"
                              disabled={submissionState === "submitting"}
                              className="action-button-primary inline-flex min-w-[12rem] items-center justify-center gap-2 self-start text-sm disabled:translate-y-0 disabled:scale-100 disabled:opacity-60 sm:self-auto"
                            >
                              {submissionState === "submitting" ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                              ) : (
                                <Send className="h-4 w-4" strokeWidth={1.75} />
                              )}
                              {submissionState === "submitting" ? "Sending message..." : "Send message"}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                <aside className="xl:sticky xl:top-[calc(var(--navbar-height)+1.25rem)]">
                  <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
                    <span className="eyebrow-label">Before you send</span>
                    <h2 className="mt-3 text-[1.45rem] leading-tight tracking-tight text-slate-950">
                      A few details help us route faster.
                    </h2>
                    <ul className="mt-5 space-y-3.5">
                      {helpfulDetails.map((detail) => (
                        <li key={detail} className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                          <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[#156d95]/70" />
                          {detail}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 rounded-[1.45rem] border border-slate-200/85 bg-slate-50/82 p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-[#156d95] shadow-[0_1px_1px_rgba(15,23,42,0.06)]">
                          <Mail className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Manual fallback
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Need to forward screenshots or continue an existing thread? Use the
                            direct inbox if the form is unavailable.
                          </p>
                        </div>
                      </div>

                      <a
                        href={`mailto:${manualFallbackEmail}`}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-950 underline-offset-4 hover:underline"
                      >
                        {manualFallbackEmail}
                        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.9} />
                      </a>
                    </div>

                    <div className="mt-4 rounded-[1.45rem] border border-[#d7e7ee] bg-[#eef7fb] p-5">
                      <p className="text-sm leading-6 text-slate-600">
                        This page is best for product feedback, data corrections, feature requests,
                        and external inquiries. It is not a live clinical support channel.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </main>
      </PageTransitionShell>
      <SiteFooter />
    </>
  );
}
