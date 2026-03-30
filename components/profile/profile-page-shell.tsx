"use client";

import dynamic from "next/dynamic";

const ProfilePageClient = dynamic(
  () => import("@/components/profile/profile-page-client").then((mod) => mod.ProfilePageClient),
  {
    ssr: false,
    loading: () => <div className="px-6 py-32 text-center text-slate-500">Loading profile…</div>,
  },
);

export function ProfilePageShell() {
  return <ProfilePageClient />;
}
