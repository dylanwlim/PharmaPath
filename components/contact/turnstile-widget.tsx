"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "interaction-only" | "execute";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  error?: string;
  onTokenChange: (token: string) => void;
  resetKey?: number;
  siteKey: string;
};

export function TurnstileWidget({
  error,
  onTokenChange,
  resetKey = 0,
  siteKey,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || !window.turnstile) {
      return;
    }

    if (!widgetIdRef.current) {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",
        appearance: "always",
        callback: (token) => onTokenChange(token),
        "expired-callback": () => onTokenChange(""),
        "error-callback": () => onTokenChange(""),
      });
      return;
    }

    window.turnstile.reset(widgetIdRef.current);
  }, [onTokenChange, resetKey, scriptReady, siteKey]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <div
        className={cn(
          "rounded-[1.25rem] border border-slate-200/85 bg-slate-50/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]",
          error ? "border-rose-200 bg-rose-50/90" : null,
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-[#156d95] shadow-[0_1px_1px_rgba(15,23,42,0.06)]">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">Verification check</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              This helps block abuse without interrupting the form.
            </p>
          </div>
        </div>

        <div className="mt-4 min-h-[88px] rounded-[1rem] border border-dashed border-slate-200 bg-white/94 px-3 py-3">
          <div ref={containerRef} />
          {!scriptReady ? (
            <div className="flex min-h-[56px] items-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              Loading verification...
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm leading-6 text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
