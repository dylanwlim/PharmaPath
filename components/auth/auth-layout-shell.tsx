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
    <div className="flex min-h-screen">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#e8f4fa] via-[#f5f7fb] to-[#eef8f5] lg:flex lg:w-1/2">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-[#156d95]/12 blur-3xl animate-gradient" />
          <div
            className="absolute -right-20 bottom-1/4 h-96 w-96 rounded-full bg-[#23a386]/10 blur-3xl animate-gradient"
            style={{ animationDelay: "-7s" }}
          />
        </div>

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

      <main className="flex flex-1 flex-col">
        <div className="p-6 pb-0 lg:hidden">
          <Logo />
        </div>

        <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
