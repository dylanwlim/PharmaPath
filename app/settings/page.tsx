import { Suspense } from "react";
import { SettingsPageClient } from "@/components/profile/settings-page-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

export default function SettingsPage() {
  return (
    <>
      <SiteNavbar />
      <main>
        <Suspense fallback={<div className="px-6 py-32 text-center text-slate-500">Loading settings…</div>}>
          <SettingsPageClient />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
