import type { Metadata } from "next";
import Link from "next/link";
import { PageTransitionShell } from "@/components/page-transition-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { surfaceNames } from "@/lib/surface-labels";

export const metadata: Metadata = {
  title: `${surfaceNames.methodology} | PharmaPath`,
  description:
    "Learn what PharmaPath can show, what still needs direct confirmation, and how to use it safely when comparing pharmacies and medication-related context.",
  alternates: {
    canonical: "https://pharmapath.org/methodology",
  },
};

const heroHighlights = [
  {
    title: "What PharmaPath can show",
    body: "Nearby pharmacies, store details, and medication-related context that help you decide where to start.",
  },
  {
    title: "What still needs a phone call",
    body: "Live stock, exact formulation availability, pickup timing, transfer success, and final price.",
  },
  {
    title: "How to use it safely",
    body: "Build a shortlist first, then confirm directly with the pharmacy and use clinician judgment when the decision is urgent.",
  },
];

const shownItems = [
  "Nearby pharmacies based on the place you search, along with details such as distance, hours, ratings, and map links.",
  `${surfaceNames.patient} results that help you narrow a practical call list instead of starting from scratch.`,
  `${surfaceNames.prescriber} context that can help you review broader medication questions before you call.`,
  "Community-submitted notes when available, which may help shape the next question but should not be treated as confirmation from the pharmacy.",
];

const confirmationItems = [
  "Whether a specific store has the medication on the shelf right now.",
  "Whether the exact strength, dosage form, or manufacturer you need is available.",
  "Whether same-day pickup, transfer timing, or refill timing will work for your situation.",
  "What your final out-of-pocket price, insurance coverage, prior authorization status, or substitution options will be.",
  "Any urgent medication, pharmacy, or treatment decision that should be confirmed by a pharmacist or clinician.",
];

const safeUseItems = [
  `Use ${surfaceNames.patient} to make a smarter shortlist of pharmacies to contact first.`,
  `Use ${surfaceNames.prescriber} when you want broader medication context before that call.`,
  "Call the pharmacy to confirm the exact medication, strength, and timing before you travel, transfer, or assume availability.",
  "Do not rely on PharmaPath alone for emergencies, urgent treatment changes, or time-sensitive clinical decisions.",
  "Use pharmacist or clinician guidance when a decision affects safety, substitution, or treatment planning.",
];

function BulletList({
  items,
  dotClass,
}: {
  items: string[];
  dotClass: string;
}) {
  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 text-sm leading-6 text-slate-700 sm:text-[0.97rem]"
        >
          <span
            className={`mt-2 h-1.5 w-1.5 flex-none rounded-full ${dotClass}`}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionCard({
  id,
  eyebrow,
  title,
  description,
  items,
  accentClass,
  dotClass,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
  accentClass: string;
  dotClass: string;
}) {
  return (
    <section
      id={id}
      className={`surface-panel rounded-[2rem] border p-6 sm:p-7 ${accentClass}`}
    >
      <span className="eyebrow-label">{eyebrow}</span>
      <h2 className="mt-4 text-[1.7rem] leading-tight tracking-tight text-slate-950 sm:text-[1.9rem]">
        {title}
      </h2>
      <p className="mt-3 max-w-[34rem] text-sm leading-6 text-slate-600 sm:text-[0.98rem]">
        {description}
      </p>
      <div className="mt-6">
        <BulletList items={items} dotClass={dotClass} />
      </div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <>
      <SiteNavbar />
      <PageTransitionShell>
        <section className="px-4 pb-14 pt-[calc(var(--navbar-height)+1rem)] sm:px-6 lg:px-8 lg:pb-16 lg:pt-[calc(var(--navbar-height)+1.15rem)]">
          <div className="site-shell grid gap-6 lg:grid-cols-[minmax(0,1.06fr)_minmax(20rem,0.94fr)] lg:items-start">
            <div className="max-w-[43rem]">
              <span className="eyebrow-label">{surfaceNames.methodology}</span>
              <h1 className="mt-4 text-[2.5rem] leading-[0.97] tracking-tight text-balance text-slate-950 sm:text-[3rem] xl:text-[3.3rem]">
                What PharmaPath can show, what still needs a phone call, and
                how to use it safely.
              </h1>
              <p className="mt-4 max-w-[39rem] text-[1rem] leading-7 text-slate-600 sm:text-[1.05rem]">
                PharmaPath helps you build a better pharmacy shortlist and
                review medication-related context before the next step. It does
                not confirm live stock, pickup timing, final price, or transfer
                success until the pharmacy does.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pharmacy-finder" className="action-button-primary">
                  Open {surfaceNames.patient}
                </Link>
                <Link
                  href="/prescriber"
                  className="action-button-secondary"
                >
                  Open {surfaceNames.prescriber}
                </Link>
              </div>
            </div>

            <div className="surface-panel rounded-[2.15rem] bg-white/94 p-5 shadow-none backdrop-blur-none sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Quick guide
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    The best use of PharmaPath is to narrow the next step, then
                    verify the answer directly.
                  </p>
                </div>
                <span className="h-2.5 w-2.5 flex-none rounded-full bg-[#156d95]" />
              </div>

              <div className="mt-5 space-y-3">
                {heroHighlights.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/75 p-4"
                  >
                    <h2 className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
          <div className="site-shell grid gap-6 xl:grid-cols-3">
            <SectionCard
              eyebrow="What PharmaPath shows"
              title="Use it to narrow the search, not to assume the answer."
              description="PharmaPath is most useful when you want a clearer starting point for outreach and a better sense of the medication context around that outreach."
              items={shownItems}
              accentClass="border-sky-100 bg-sky-50/70"
              dotClass="bg-sky-500"
            />

            <SectionCard
              id="needs-confirmation"
              eyebrow="What needs confirmation"
              title="Some answers still have to come from the pharmacy."
              description="A pharmacy call is still required for questions that depend on the store’s live situation, your prescription details, or your coverage."
              items={confirmationItems}
              accentClass="border-rose-100 bg-rose-50/75"
              dotClass="bg-rose-400"
            />

            <SectionCard
              eyebrow="How to use PharmaPath safely"
              title="Use the shortlist, then verify before you act."
              description="PharmaPath should help you move faster and ask better questions. It should not replace direct confirmation or clinical judgment."
              items={safeUseItems}
              accentClass="border-amber-100 bg-amber-50/75"
              dotClass="bg-amber-500"
            />
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="site-shell">
            <div className="surface-panel rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 text-white sm:p-7 lg:flex lg:items-end lg:justify-between lg:gap-8">
              <div className="max-w-[36rem]">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Next step
                </span>
                <h2 className="mt-4 text-[1.8rem] leading-tight tracking-tight text-white sm:text-[2rem]">
                  Start with a shortlist, then confirm the final answer by
                  phone.
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/75 sm:text-[0.98rem]">
                  Use {surfaceNames.patient} to compare nearby options, or open{" "}
                  {surfaceNames.prescriber} when you want broader medication
                  context before you call.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 lg:mt-0 lg:justify-end">
                <Link
                  href="/pharmacy-finder"
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-100"
                >
                  Open {surfaceNames.patient}
                </Link>
                <Link
                  href="/prescriber"
                  className="rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white transition-colors hover:border-white/35 hover:bg-white/10"
                >
                  Open {surfaceNames.prescriber}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </PageTransitionShell>
      <SiteFooter />
    </>
  );
}
