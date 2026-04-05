import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDocumentLayout,
  type LegalDocumentSection,
} from "@/components/legal/legal-document-layout";

const lastUpdated = "April 4, 2026";

const sections: LegalDocumentSection[] = [
  {
    id: "acceptance-and-eligibility",
    title: "Acceptance and eligibility",
    navLabel: "Acceptance",
    content: (
      <>
        <p>
          By accessing or using PharmaPath, you agree to these Terms of Use. If
          you do not agree, do not use the service.
        </p>
        <p>
          These Terms apply to the public site, search tools, account options,
          contributor reports, contact forms, and related content made
          available by PharmaPath.
        </p>
        <p>
          You must be legally able to enter into these Terms to create an
          account or use the service.
        </p>
      </>
    ),
  },
  {
    id: "what-pharmapath-provides",
    title: "Service scope",
    navLabel: "Service scope",
    content: (
      <>
        <p>
          PharmaPath helps users identify pharmacies to contact and review
          information that may help them prepare for those conversations.
        </p>
        <p>
          The service is designed to support clearer next steps. It does not
          promise live inventory, same-day fills, successful transfers, final
          pricing, insurance outcomes, or any specific pharmacy result.
        </p>
      </>
    ),
  },
  {
    id: "verification-and-medical-boundaries",
    title: "Verification and medical limits",
    navLabel: "Verification and medical limits",
    content: (
      <>
        <p>
          Pharmacy details, medication information, and contributor signals can
          be incomplete, stale, unavailable, or wrong. Pharmacy hours, staffing,
          stock, and policies can change without notice. You are responsible for
          verifying availability, pickup timing, transfer steps, and similar
          details directly with the pharmacy.
        </p>
        <p>
          PharmaPath does not provide medical advice, diagnosis, treatment, or
          emergency guidance. Nothing on the site should be treated as a
          substitute for a pharmacist, licensed clinician, or emergency service.
        </p>
        <p>
          If a situation is urgent or emergency-related, do not rely on
          PharmaPath alone. Contact the appropriate pharmacy, clinician, or
          emergency service directly.
        </p>
      </>
    ),
  },
  {
    id: "accounts-and-submissions",
    title: "Accounts and submissions",
    navLabel: "Accounts and submissions",
    content: (
      <>
        <p>
          If you create an account, you agree to provide accurate information,
          keep your credentials secure, and promptly notify PharmaPath if you
          suspect unauthorized use.
        </p>
        <p>
          If you submit a contributor report or other content, you represent
          that you have the right to submit it and that it is materially
          accurate to the best of your knowledge. Do not submit content that is
          deceptive, unlawful, abusive, or that improperly discloses another
          person&apos;s confidential information.
        </p>
        <p>
          You retain rights you may have in your content, but you grant
          PharmaPath a non-exclusive right to store, display, reproduce, and use
          it as needed to operate, moderate, protect, and improve the service.
          PharmaPath may remove or limit content that does not fit the
          service&apos;s rules or quality boundaries.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    navLabel: "Acceptable use",
    content: (
      <>
        <p>You may not use PharmaPath to:</p>
        <ul className="space-y-3 pl-5 text-[0.97rem] leading-7 text-slate-600 marker:text-slate-400">
          <li>Break the law or violate another person&apos;s rights.</li>
          <li>
            Interfere with the service, attempt unauthorized access, or use
            abusive scraping, automation, or other activity that burdens the
            service.
          </li>
          <li>
            Submit false, misleading, harassing, abusive, or otherwise unlawful
            content.
          </li>
          <li>
            Present PharmaPath output as a guaranteed stock feed, medical order,
            insurance determination, or emergency instruction.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "third-party-services-and-links",
    title: "External services and links",
    navLabel: "External services and links",
    content: (
      <>
        <p>
          Some parts of PharmaPath depend on outside services, data sources, or
          destinations that PharmaPath does not control. Those services may
          change, become unavailable, or behave differently without notice.
        </p>
        <p>
          When PharmaPath links to a third-party site, map, or service, your use
          of that destination is governed by that third party&apos;s own terms and
          policies.
        </p>
      </>
    ),
  },
  {
    id: "ownership-and-permitted-use",
    title: "Ownership and permitted use",
    navLabel: "Ownership and use",
    content: (
      <>
        <p>
          The PharmaPath service, including its software, design, layout, copy,
          branding, and original content, is protected by intellectual property
          law. These Terms do not give you ownership of the service or any right
          to reproduce, reverse engineer, or commercially exploit it beyond
          permitted use.
        </p>
        <p>
          Third-party names, marks, and data remain subject to their respective
          owners&apos; rights.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers-and-liability",
    title: "Disclaimers and liability",
    navLabel: "Disclaimers and liability",
    content: (
      <>
        <p>
          PharmaPath is provided on an &quot;as is&quot; and &quot;as available&quot;
          basis to the fullest extent permitted by law. We do not warrant that
          the service will always be uninterrupted, error-free, complete,
          secure, or accurate.
        </p>
        <p>
          To the fullest extent permitted by law, PharmaPath and its affiliates,
          operators, and service providers are not liable for indirect,
          incidental, special, consequential, exemplary, or punitive damages, or
          for lost profits, lost data, lost business, treatment delays,
          purchasing decisions, or pharmacy outcomes arising out of or related
          to use of the service.
        </p>
        <p>
          To the fullest extent permitted by law, any direct liability will be
          limited to the greater of one hundred U.S. dollars (US$100) or the
          amount you paid to PharmaPath for the specific service giving rise to
          the claim. The public service is offered without a usage fee.
        </p>
      </>
    ),
  },
  {
    id: "changes-suspension-and-contact",
    title: "Changes, suspension, and contact",
    navLabel: "Changes and contact",
    content: (
      <>
        <p>
          We may update these Terms, change or discontinue parts of the
          service, or suspend access at any time. When we materially update
          these Terms, we will revise the last-updated date on this page.
        </p>
        <p>
          PharmaPath may suspend or terminate access if we believe a user has
          violated these Terms, created security risk, or misused the service.
        </p>
        <p>
          Questions about these Terms can be sent through{" "}
          <Link
            href="/contact"
            className="text-[#156d95] transition-colors duration-150 hover:text-[#0f5d7d]"
          >
            the contact page
          </Link>{" "}
          or by email at{" "}
          <a
            href="mailto:contact@pharmapath.org"
            className="text-[#156d95] transition-colors duration-150 hover:text-[#0f5d7d]"
          >
            contact@pharmapath.org
          </a>
          .
        </p>
      </>
    ),
  },
];

export const metadata: Metadata = {
  title: "Terms of Use | PharmaPath",
  description:
    "Terms governing use of PharmaPath, including user responsibilities, verification limits, and liability limits.",
  alternates: {
    canonical: "https://pharmapath.org/terms",
  },
};

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      eyebrow="Terms"
      title="Terms of Use"
      intro="These Terms explain the rules for using PharmaPath and what still must be verified directly with a pharmacy or relevant professional."
      lastUpdated={lastUpdated}
      sections={sections}
      sidebarContent={
        <>
          <p>
            Use PharmaPath to prepare for pharmacy outreach, not as a final
            source of stock, timing, pricing, transfer, or clinical guidance.
          </p>
        </>
      }
    />
  );
}
