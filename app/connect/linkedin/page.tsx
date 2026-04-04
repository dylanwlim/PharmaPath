import type { Metadata } from "next";
import { ConnectComingSoonPage } from "@/components/static-pages/connect-coming-soon-page";

export const metadata: Metadata = {
  title: "LinkedIn Coming Soon | PharmaPath",
  description:
    "PharmaPath’s LinkedIn page is in progress. Check back soon for the public launch.",
  alternates: {
    canonical: "https://pharmapath.org/connect/linkedin",
  },
};

export default function LinkedInComingSoonPage() {
  return (
    <ConnectComingSoonPage
      platformLabel="LinkedIn"
      title="LinkedIn coming soon"
      description="We’re working on PharmaPath’s LinkedIn presence. Check back soon."
    />
  );
}
