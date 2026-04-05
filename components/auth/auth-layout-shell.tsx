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
    <div className="relative min-h-screen overflow-hidden bg-[#fbfcfb]">
      <div className="absolute inset-0 hidden lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(112deg,#e8f4fa_0%,#f3f8fb_31%,#fbfcfb_57%,#ffffff_84%)]" />
        <div className="absolute -left-12 top-[8%] h-[30rem] w-[30rem] rounded-full bg-[#156d95]/12 blur-3xl animate-gradient" />
        <div
          className="absolute left-[30%] top-[24%] h-[24rem] w-[24rem] rounded-full bg-[#8dcfdf]/10 blur-3xl animate-gradient"
          style={{ animationDelay: "-4s" }}
        />
        <div
          className="absolute left-[22%] bottom-[-8%] h-[28rem] w-[28rem] rounded-full bg-[#23a386]/10 blur-3xl animate-gradient"
          style={{ animationDelay: "-7s" }}
        />
        <div className="absolute inset-y-0 right-[-10%] w-[62%] bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.58)_0%,rgba(255,255,255,0.88)_42%,rgba(255,255,255,0.97)_68%,rgba(255,255,255,1)_100%)]" />
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

          <div className="relative z-10 flex flex-1 items-center justify-center p-6 lg:p-12">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
