import type { ReactNode } from "react";
import { Activity, ShieldCheck, Waves } from "lucide-react";
import { SiteBrand } from "@/components/site-brand";

function Logo() {
  return <SiteBrand />;
}

const valuePoints = [
  {
    icon: Activity,
    title: "Live",
    description: "Nearby pharmacy discovery",
  },
  {
    icon: Waves,
    title: "Weighted",
    description: "Crowd reports by trust + recency",
  },
  {
    icon: ShieldCheck,
    title: "Truthful",
    description: "No false stock claims",
  },
];

export function AuthLayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#eef7fb_0%,#f7fbfd_34%,#fbfcfb_66%,#ffffff_100%)]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(21,109,149,0.12),transparent_28%),radial-gradient(circle_at_30%_72%,rgba(35,163,134,0.1),transparent_26%),radial-gradient(circle_at_72%_18%,rgba(141,207,223,0.09),transparent_22%),linear-gradient(135deg,#eef7fb_0%,#f7fbfd_34%,#fbfcfb_66%,#ffffff_100%)]" />
        <div className="absolute -left-14 top-[6%] hidden h-[30rem] w-[30rem] rounded-full bg-[#156d95]/12 blur-3xl animate-gradient lg:block" />
        <div
          className="absolute left-[28%] top-[22%] hidden h-[24rem] w-[24rem] rounded-full bg-[#8dcfdf]/10 blur-3xl animate-gradient lg:block"
          style={{ animationDelay: "-4s" }}
        />
        <div
          className="absolute left-[20%] bottom-[-10%] hidden h-[28rem] w-[28rem] rounded-full bg-[#23a386]/10 blur-3xl animate-gradient lg:block"
          style={{ animationDelay: "-7s" }}
        />
        <div className="absolute inset-y-0 right-[-12%] hidden w-[58%] bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.86)_44%,rgba(255,255,255,0.98)_70%,rgba(255,255,255,1)_100%)] lg:block" />
      </div>

      <div className="relative flex min-h-screen">
        <div className="relative hidden overflow-hidden lg:flex lg:w-[54%]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />

          <div className="relative z-10 flex w-full flex-col p-12 xl:p-14">
            <Logo />

            <div className="flex flex-1 items-center py-10">
              <div className="w-full space-y-10">
                <div className="max-w-xl space-y-4">
                  <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-slate-500">
                    Contributor access
                  </p>
                  <div className="space-y-3">
                    <h2 className="max-w-lg text-4xl font-semibold tracking-tight text-balance text-slate-950 xl:text-[3.5rem] xl:leading-[1.05]">
                      Welcome to the search that stays grounded.
                    </h2>
                    <p className="max-w-lg text-base leading-7 text-slate-600 xl:text-lg">
                      Sign in to a calmer view of nearby pharmacy discovery, shaped by verified context and community signal.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  {valuePoints.map((point) => (
                    <div
                      key={point.title}
                      className="rounded-[1.75rem] border border-white/65 bg-white/60 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur-sm transition-transform duration-300 ease-out hover:-translate-y-0.5"
                    >
                      <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#156d95]/8 text-[#156d95]">
                        <point.icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[1.75rem] font-semibold tracking-tight text-slate-950">
                          {point.title}
                        </p>
                        <p className="max-w-[13rem] text-sm leading-6 text-slate-600 xl:text-[0.95rem]">
                          {point.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="relative flex flex-1 flex-col lg:flex-[0.92]">
          <div className="p-6 pb-0 lg:hidden">
            <Logo />
          </div>

          <div className="relative z-10 flex flex-1 items-center justify-center p-6 lg:p-10 xl:p-12">
            <div className="w-full max-w-[34rem] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="rounded-[2rem] border border-white/80 bg-white/84 p-7 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:p-8 lg:p-9">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
