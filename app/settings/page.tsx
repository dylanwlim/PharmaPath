import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { SettingsPageShell } from "@/components/profile/settings-page-shell";

export default function SettingsPage() {
  return (
    <>
      <SiteNavbar />
      <main>
        <SettingsPageShell />
      </main>
      <SiteFooter />
    </>
  );
}
