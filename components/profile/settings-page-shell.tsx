"use client";

import dynamic from "next/dynamic";

const SettingsPageClient = dynamic(
  () => import("@/components/profile/settings-page-client").then((mod) => mod.SettingsPageClient),
  {
    ssr: false,
    loading: () => <div className="px-6 py-32 text-center text-slate-500">Loading settings…</div>,
  },
);

export function SettingsPageShell() {
  return <SettingsPageClient />;
}
