import type { ReactNode } from "react";
import Link from "next/link";
import { LegalTableOfContents } from "@/components/legal/legal-table-of-contents";
import { PageTransitionShell } from "@/components/page-transition-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

export type LegalDocumentSection = {
  id: string;
  title: string;
  navLabel?: string;
  summary?: string;
  content: ReactNode;
};

type LegalDocumentLayoutProps = {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalDocumentSection[];
  sidebarContent: ReactNode;
};

function LegalSection({
  id,
  title,
  summary,
  content,
}: LegalDocumentSection) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-[calc(var(--navbar-height)+2rem)] rounded-[1.2rem] border border-slate-200/88 bg-white/97 p-4 shadow-[0_1px_1px_rgba(15,23,42,0.04),0_12px_28px_rgba(15,23,42,0.035)] sm:p-5 lg:p-[1.3rem]"
    >
      <div className="max-w-[45rem]">
        <h2
          id={`${id}-heading`}
          className="text-[1.3rem] leading-tight tracking-tight text-slate-950 sm:text-[1.42rem]"
        >
          {title}
        </h2>
        {summary ? (
          <p className="mt-2 max-w-2xl text-[0.92rem] leading-6 text-slate-500">
            {summary}
          </p>
        ) : null}
        <div className="mt-3 space-y-3.5 text-[0.94rem] leading-[1.72] text-slate-600">
          {content}
        </div>
      </div>
    </section>
  );
}

export function LegalDocumentLayout({
  eyebrow,
  title,
  intro,
  lastUpdated,
  sections,
  sidebarContent,
}: LegalDocumentLayoutProps) {
  return (
    <>
      <SiteNavbar />
      <PageTransitionShell>
        <section className="px-4 pb-2 pt-[calc(var(--navbar-height)+0.45rem)] sm:px-6 sm:pb-3 sm:pt-[calc(var(--navbar-height)+0.55rem)] lg:px-8 lg:pb-4 lg:pt-[calc(var(--navbar-height)+0.65rem)]">
          <div className="site-shell">
            <div className="max-w-[42rem]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="eyebrow-label">{eyebrow}</span>
                <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-white/90 px-3 py-1 text-[0.8rem] font-medium text-slate-600 shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
                  Updated {lastUpdated}
                </span>
              </div>
              <h1 className="mt-3 max-w-[38rem] text-[2.2rem] leading-[1.01] tracking-tight text-slate-950 sm:text-[2.62rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-[38rem] text-[0.98rem] leading-7 text-slate-600 sm:text-[1rem]">
                {intro}
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 pb-12 sm:px-6 sm:pb-14 lg:px-8">
          <div className="site-shell grid gap-5 lg:grid-cols-[19.5rem_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[20.25rem_minmax(0,1fr)]">
            <article className="max-w-[46rem] space-y-3.5 sm:space-y-4 lg:col-start-2">
              {sections.map((section) => (
                <LegalSection key={section.id} {...section} />
              ))}
            </article>

            <aside className="lg:sticky lg:top-[calc(var(--navbar-height)+1.35rem)] lg:col-start-1 lg:row-start-1">
              <div className="space-y-3 lg:pr-1">
                <div className="rounded-[1.15rem] border border-slate-200/88 bg-white/95 p-4 shadow-[0_1px_1px_rgba(15,23,42,0.04),0_12px_28px_rgba(15,23,42,0.035)] sm:p-[1.05rem]">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    On this page
                  </div>
                  <LegalTableOfContents sections={sections} />
                </div>

                <div className="hidden rounded-[1.05rem] border border-slate-200/80 bg-white/90 p-3.5 shadow-[0_1px_1px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.03)] lg:block">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Quick note
                  </div>
                  <div className="mt-2.5 space-y-2.5 text-[0.88rem] leading-6 text-slate-600">
                    {sidebarContent}
                  </div>
                  <div className="mt-3 border-t border-slate-200/85 pt-3">
                    <Link
                      href="/contact"
                      className="inline-flex items-center rounded-full px-1 py-0.5 text-[0.88rem] text-[#156d95] transition-colors duration-150 hover:text-[#0f5d7d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#156d95]/10"
                    >
                      Questions about this page?
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </PageTransitionShell>
      <div className="pt-5 sm:pt-6">
        <SiteFooter />
      </div>
    </>
  );
}
