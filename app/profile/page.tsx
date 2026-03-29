import { Suspense } from "react";
import { ProfilePageClient } from "@/components/profile/profile-page-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

export default function ProfilePage() {
  return (
    <>
      <SiteNavbar />
      <main>
        <Suspense fallback={<div className="px-6 py-32 text-center text-slate-500">Loading profile…</div>}>
          <ProfilePageClient />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
