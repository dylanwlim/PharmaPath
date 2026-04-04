import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDocumentLayout,
  type LegalDocumentSection,
} from "@/components/legal/legal-document-layout";

const lastUpdated = "April 4, 2026";

const sections: LegalDocumentSection[] = [
  {
    id: "acceptance-scope",
    title: "Acceptance and scope",
    summary:
      "These Terms apply to the current PharmaPath site, product flows, and related pages.",
    content: (
      <>
        <p>
          By accessing or using PharmaPath, you agree to these Terms. If you do
          not agree, do not use the service.
        </p>
        <p>
          These Terms cover the public website, nearby pharmacy and
          medication-context flows, account and contributor features, contact
          submissions, and related content made available by PharmaPath.
        </p>
      </>
    ),
  },
  {
    id: "service-description",
    title: "Description of the service",
    summary:
      "The product is designed as a routing and context tool, not as a stock-verification system.",
    content: (
      <>
        <p>
          PharmaPath helps users identify nearby pharmacies worth calling first
          and review medication-access context such as shortage, formulation,
          recall, and manufacturer signals. The service is intended to support
          better calls and clearer decisions.
        </p>
        <p>
          PharmaPath does not guarantee live inventory, successful transfers,
          same-day fills, insurance outcomes, or final pricing. Users are
          responsible for verifying medication availability and next steps
          directly with the pharmacy and, where relevant, with their prescriber
          or care team.
        </p>
      </>
    ),
  },
  {
    id: "eligibility-accounts",
    title: "Eligibility and account responsibilities",
    summary:
      "Account features are optional, but users who register are responsible for account security and accurate profile information.",
    content: (
      <>
        <p>
          You must be legally able to enter into these Terms to create an
          account or use the service. If you create an account, you agree to
          provide accurate information and to keep your login credentials secure.
        </p>
        <p>
          You are responsible for activity that occurs through your account.
          Notify PharmaPath promptly if you believe your account has been used
          without authorization.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    summary:
      "PharmaPath may be used for lawful, responsible medication-access research and workflow support.",
    content: (
      <>
        <p>You may not use PharmaPath to:</p>
        <ul className="space-y-3 pl-5 text-[0.98rem] leading-7 text-slate-600 marker:text-slate-400">
          <li>Break the law or violate another person’s rights.</li>
          <li>
            Interfere with the service, attempt unauthorized access, or run
            abusive scraping or automation against the product.
          </li>
          <li>
            Submit false, misleading, harassing, or unlawful contributor
            content.
          </li>
          <li>
            Present PharmaPath output as a guaranteed stock feed, medical order,
            insurance determination, or emergency guidance.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "accuracy-limitations",
    title: "Accuracy and informational-use limitations",
    summary:
      "The service is intentionally conservative about what it knows and what still requires verification.",
    content: (
      <>
        <p>
          Nearby pharmacy details, medication-reference data, and contributor
          signals can be useful, but they may be incomplete, stale, unavailable,
          or wrong. Third-party data sources may change without notice, and
          pharmacies may update their own inventory, hours, staffing, or fill
          policies at any time.
        </p>
        <p>
          PharmaPath helps users make better calls and decisions. It does not
          guarantee live inventory. Medication and pharmacy information is
          contextual and supportive, not definitive. Users must verify stock and
          pickup details directly with the pharmacy.
        </p>
      </>
    ),
  },
  {
    id: "no-medical-advice",
    title: "No medical advice and no emergency use",
    summary:
      "The product is informational and workflow-oriented, not clinical care.",
    content: (
      <>
        <p>
          PharmaPath does not provide medical advice, diagnosis, treatment, or
          emergency guidance. Nothing on the site should be treated as a
          substitute for a licensed clinician, pharmacist, or emergency service.
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
    id: "contributor-submissions",
    title: "Contributor submissions and user content",
    summary:
      "Account holders may submit contributor reports, but those reports remain subject to product rules and review.",
    content: (
      <>
        <p>
          If you submit a contributor report, you represent that you have the
          right to submit it and that the information is materially accurate to
          the best of your knowledge. Do not submit content that is deceptive,
          unlawful, abusive, or that improperly discloses another person’s
          confidential information.
        </p>
        <p>
          You retain rights you may have in your content, but you grant
          PharmaPath a non-exclusive right to store, display, reproduce, and use
          that content as needed to operate, improve, moderate, and protect the
          service. PharmaPath may remove or limit contributor content that does
          not fit the product’s rules or quality boundaries.
        </p>
      </>
    ),
  },
  {
    id: "third-party-links-services",
    title: "Third-party links and services",
    summary:
      "PharmaPath depends on outside services for parts of the experience and may link out to third-party destinations.",
    content: (
      <>
        <p>
          Some features depend on third-party services, including Google-powered
          location and nearby pharmacy services, openFDA medication-reference
          data, Firebase account services, and external map links. Those
          services may be unavailable or may change independently of PharmaPath.
        </p>
        <p>
          When PharmaPath links to a third-party site or service, your use of
          that destination is governed by that third party’s own terms and
          policies.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    summary:
      "PharmaPath retains rights in the service, design, copy, and software except where third-party rights apply.",
    content: (
      <>
        <p>
          The PharmaPath service, including its software, design, layout, copy,
          branding, and original content, is protected by intellectual property
          laws. These Terms do not give you ownership of the service or any
          right to reproduce, reverse engineer, or commercially exploit it
          beyond permitted use.
        </p>
        <p>
          Third-party names, marks, datasets, and service content remain subject
          to their respective owners’ rights.
        </p>
      </>
    ),
  },
  {
    id: "warranties-liability",
    title: "Disclaimer of warranties and limitation of liability",
    summary:
      "These provisions reflect the product’s current informational and third-party-dependent nature.",
    content: (
      <>
        <p>
          PharmaPath is provided on an “as is” and “as available” basis to the
          fullest extent allowed by law. We do not warrant that the service will
          always be uninterrupted, error-free, complete, secure, or accurate.
        </p>
        <p>
          To the fullest extent allowed by law, PharmaPath and its affiliates,
          operators, and service providers will not be liable for indirect,
          incidental, special, consequential, exemplary, or punitive damages, or
          for lost profits, lost data, lost business, treatment delays,
          purchasing decisions, or pharmacy outcomes arising from or related to
          use of the service.
        </p>
        <p>
          To the fullest extent allowed by law, any direct liability will be
          limited to the greater of one hundred U.S. dollars (US$100) or the
          amount you paid to PharmaPath for the specific service giving rise to
          the claim. The current public product does not charge usage fees.
        </p>
      </>
    ),
  },
  {
    id: "changes-termination-contact",
    title: "Changes to the service or Terms, termination, and contact information",
    summary:
      "PharmaPath may evolve, pause, or remove parts of the service as the product changes.",
    content: (
      <>
        <p>
          We may update these Terms, modify features, suspend access, or
          discontinue part of the service at any time. When we materially update
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
    "Terms governing PharmaPath’s medication-access search, account features, contributor reports, and informational-use boundaries.",
  alternates: {
    canonical: "https://pharmapath.org/terms",
  },
};

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      eyebrow="Terms"
      title="Terms of Use"
      intro="These Terms explain the current rules for using PharmaPath’s medication-access search, account features, contributor tools, and related site content."
      lastUpdated={lastUpdated}
      sections={sections}
      sidebarContent={
        <>
          <p>
            PharmaPath is designed to support better pharmacy calls and planning
            decisions, not to guarantee stock or replace direct verification.
          </p>
          <p>
            The product uses third-party services for location, pharmacy, email,
            analytics, and account functionality, and those dependencies shape
            the accuracy and availability boundaries described here.
          </p>
          <p>
            For the product rationale behind these boundaries, see{" "}
            <Link
              href="/methodology"
              className="text-[#156d95] transition-colors duration-150 hover:text-[#0f5d7d]"
            >
              Methodology
            </Link>
            .
          </p>
        </>
      }
    />
  );
}
