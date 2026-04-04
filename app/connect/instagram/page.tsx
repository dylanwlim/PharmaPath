import type { Metadata } from "next";
import { ConnectComingSoonPage } from "@/components/static-pages/connect-coming-soon-page";

export const metadata: Metadata = {
  title: "Instagram Coming Soon | PharmaPath",
  description:
    "PharmaPath’s Instagram page is in progress. Check back soon for the public launch.",
  alternates: {
    canonical: "https://pharmapath.org/connect/instagram",
  },
};

export default function InstagramComingSoonPage() {
  return (
    <ConnectComingSoonPage
      platformLabel="Instagram"
      title="Instagram coming soon"
      description="We’re working on PharmaPath’s Instagram presence. Check back soon."
    />
  );
}
