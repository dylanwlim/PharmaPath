import type { ReactNode } from "react";
import Link from "next/link";
import { PageTransitionShell } from "@/components/page-transition-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

export type LegalDocumentSection = {
  id: string;
  title: string;
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
      className="surface-panel scroll-mt-[calc(var(--navbar-height)+1.5rem)] rounded-[2rem] p-6 sm:p-7"
    >
      <div className="max-w-3xl">
        <h2 className="text-[1.55rem] tracking-tight text-slate-950 sm:text-[1.8rem]">
          {title}
        </h2>
        {summary ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            {summary}
          </p>
        ) : null}
        <div className="mt-5 space-y-4 text-[0.98rem] leading-7 text-slate-600">
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
        <section className="px-4 pb-10 pt-28 sm:px-6 lg:px-8">
          <div className="site-shell grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="max-w-[44rem]">
              <span className="eyebrow-label">{eyebrow}</span>
              <h1 className="mt-6 text-[2.7rem] leading-tight tracking-tight text-slate-950 sm:text-[3.35rem]">
                {title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                {intro}
              </p>
            </div>

            <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
              <span className="eyebrow-label">Document details</span>
              <div className="mt-5 rounded-[1.4rem] border border-slate-200/80 bg-white/88 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Last updated
                </div>
                <div className="mt-2 text-base font-medium text-slate-950">
                  {lastUpdated}
                </div>
              </div>
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
                {sidebarContent}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="site-shell grid gap-8 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:items-start">
            <aside className="lg:sticky lg:top-[calc(var(--navbar-height)+1.5rem)]">
              <div className="surface-panel rounded-[1.85rem] p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  On this page
                </div>
                <nav className="mt-4 flex flex-col gap-1.5">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="rounded-[1rem] px-3 py-2 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-100/80 hover:text-slate-950"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <Link
                    href="/contact"
                    className="text-sm text-[#156d95] transition-colors duration-150 hover:text-[#0f5d7d]"
                  >
                    Privacy or terms question? Contact PharmaPath.
                  </Link>
                </div>
              </div>
            </aside>

            <article className="space-y-5">
              {sections.map((section) => (
                <LegalSection key={section.id} {...section} />
              ))}
            </article>
          </div>
        </section>
      </PageTransitionShell>
      <SiteFooter />
    </>
  );
}
