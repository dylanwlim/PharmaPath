import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";

export default function ProfilePage() {
  return (
    <>
      <SiteNavbar />
      <main>
        <ProfilePageShell />
      </main>
      <SiteFooter />
    </>
  );
}
