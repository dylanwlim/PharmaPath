import Link from "next/link";
import { PageTransitionShell } from "@/components/page-transition-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

type ConnectComingSoonPageProps = {
  platformLabel: string;
  title: string;
  description: string;
};

export function ConnectComingSoonPage({
  platformLabel,
  title,
  description,
}: ConnectComingSoonPageProps) {
  return (
    <>
      <SiteNavbar />
      <PageTransitionShell>
        <section className="px-4 pb-14 pt-28 sm:px-6 sm:pb-16 lg:px-8">
          <div className="site-shell grid gap-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(18rem,0.64fr)] lg:items-start">
            <div className="max-w-[38rem]">
              <span className="eyebrow-label">Connect</span>
              <h1 className="mt-6 text-[2.7rem] leading-tight tracking-tight text-slate-950 sm:text-[3.3rem]">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                {description}
              </p>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">
                This route is reserved so PharmaPath can launch a consistent
                public profile when the channel is ready.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/" className="action-button-primary">
                  Back to overview
                </Link>
                <Link
                  href="/contact"
                  className="action-button-secondary text-sm"
                >
                  Contact PharmaPath
                </Link>
              </div>
            </div>

            <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
              <span className="eyebrow-label">Status</span>
              <div className="mt-5 space-y-4">
                <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/90 px-5 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Platform
                  </div>
                  <div className="mt-2 text-lg tracking-tight text-slate-950">
                    {platformLabel}
                  </div>
                </div>

                <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/90 px-5 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Availability
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The public {platformLabel} destination is not live yet. The
                    rest of the site remains the primary product surface.
                  </p>
                </div>

                <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/90 px-5 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    In the meantime
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use the overview, methodology, and contact pages for current
                    product information and direct outreach.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageTransitionShell>
      <SiteFooter />
    </>
  );
}
