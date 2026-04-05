import type { ReactNode } from "react";
import { Activity, ShieldCheck, Waves } from "lucide-react";
import { SiteBrand } from "@/components/site-brand";

function Logo({
  wordmarkClassName,
  className,
}: {
  wordmarkClassName?: string;
  className?: string;
}) {
  return <SiteBrand className={className} wordmarkClassName={wordmarkClassName} />;
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
    <div className="relative min-h-screen overflow-hidden bg-[#f3f6fa] lg:h-screen">
      <div className="relative flex min-h-screen lg:h-screen">
        <div className="relative hidden overflow-hidden lg:flex lg:w-[50%] lg:bg-[#edfdf6]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(21,109,149,0.08),transparent_34%),radial-gradient(circle_at_76%_78%,rgba(35,163,134,0.09),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.22),rgba(237,253,246,0.82))]" />
          <div className="absolute inset-y-0 right-0 w-px bg-[#d5e8df]" />

          <div className="relative z-10 flex w-full flex-col px-10 py-8 xl:px-12 xl:py-10">
            <Logo className="text-slate-950 hover:text-[#156d95]" wordmarkClassName="text-slate-950" />

            <div className="flex flex-1 items-center py-6">
              <div className="w-full space-y-8">
                <div className="max-w-xl space-y-3">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-[#4f8f7c]">
                    Contributor access
                  </p>
                  <div className="space-y-2.5">
                    <h2 className="max-w-md text-[3rem] font-semibold tracking-tight text-balance text-slate-950 xl:text-[3.35rem] xl:leading-[1.03]">
                      Welcome to the search that stays grounded.
                    </h2>
                    <p className="max-w-lg text-[1.02rem] leading-7 text-slate-700">
                      Sign in to a calmer view of nearby pharmacy discovery, shaped by verified context and community signal.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-3">
                  {valuePoints.map((point) => (
                    <div
                      key={point.title}
                      className="rounded-[1.4rem] border border-[#d8ebe3] bg-white/62 p-5 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.16)] backdrop-blur-sm transition-colors duration-200 hover:bg-white/72"
                    >
                      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#dff3eb] text-[#156d95]">
                        <point.icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
                          {point.title}
                        </p>
                        <p className="max-w-[11rem] text-[0.92rem] leading-6 text-slate-600">
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

        <main className="relative flex flex-1 flex-col bg-[#f6f8fb] lg:flex-[0.98]">
          <div className="p-6 pb-0 lg:hidden">
            <Logo />
          </div>

          <div className="relative z-10 flex flex-1 items-center justify-center p-6 lg:p-8 xl:p-10">
            <div className="w-full max-w-[35rem] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="rounded-[1.75rem] border border-slate-200/90 bg-white p-6 shadow-[0_26px_72px_-44px_rgba(15,23,42,0.28)] sm:p-7 lg:p-7 xl:p-8">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
