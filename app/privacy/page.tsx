import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDocumentLayout,
  type LegalDocumentSection,
} from "@/components/legal/legal-document-layout";

const lastUpdated = "April 4, 2026";

const sections: LegalDocumentSection[] = [
  {
    id: "overview",
    title: "Overview",
    navLabel: "Overview",
    content: (
      <>
        <p>
          This Privacy Policy explains how PharmaPath collects, uses, shares,
          and stores information when you browse the site, run searches, create
          an account, submit a contributor report, or contact us.
        </p>
        <p>
          PharmaPath is designed to help people identify pharmacies to contact
          and review medication-access context. It is not a live inventory
          guarantee, a medical record, or a substitute for direct pharmacy
          confirmation, clinical judgment, or emergency care.
        </p>
      </>
    ),
  },
  {
    id: "information-you-provide",
    title: "Information you share",
    navLabel: "Information you share",
    content: (
      <>
        <p>You may provide information directly to PharmaPath, including:</p>
        <ul className="space-y-3 pl-5 text-[0.97rem] leading-7 text-slate-600 marker:text-slate-400">
          <li>
            Search details, such as the medication, strength, and location
            information you enter to search nearby pharmacies or review
            medication information.
          </li>
          <li>
            Account details, such as your name, email address, password, search
            preferences, contributor alias, and profile settings.
          </li>
          <li>
            Contributor submissions, such as a pharmacy name, location details,
            medication query, report type, optional note, and links you choose
            to attach.
          </li>
          <li>
            Messages you send to PharmaPath, including contact-form submissions
            and email correspondence.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "automatic-data",
    title: "Technical and usage data",
    navLabel: "Technical and usage data",
    content: (
      <>
        <p>
          Like most websites, PharmaPath and the providers that host, secure,
          and support it may receive technical data such as IP address, browser
          and device information, page requests, timestamps, referring pages,
          and general diagnostics or security events.
        </p>
        <p>
          We may also use cookies, local storage, session storage, and similar
          tools to keep you signed in, remember interface choices, improve
          performance, and reduce abuse. If you block some browser storage
          settings,
          parts of the site may not work as intended.
        </p>
      </>
    ),
  },
  {
    id: "search-account-and-contributor-data",
    title: "Searches, accounts, and reports",
    navLabel: "Searches, accounts, and reports",
    content: (
      <>
        <p>
          We use search inputs to return nearby pharmacy results, medication
          information, and related account or reporting services. Some
          medication queries can be sensitive, but PharmaPath treats them as
          search information used to provide the site, not as part of a medical
          chart or a live inventory record.
        </p>
        <p>
          If you create an account, PharmaPath may store profile information,
          search preferences, limited recent search history, and a link between
          your account and contributor submissions.
        </p>
        <p>
          If you choose a public contributor alias, it may appear with your
          future submissions. If you choose a private setting, PharmaPath shows
          a generic private contributor label instead.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "How we use information",
    navLabel: "How we use information",
    content: (
      <>
        <p>We use information to:</p>
        <ul className="space-y-3 pl-5 text-[0.97rem] leading-7 text-slate-600 marker:text-slate-400">
          <li>
            Provide nearby pharmacy search, medication information, account
            access, and user-submitted reports.
          </li>
          <li>
            Maintain profiles, recent activity, and contributor history tied to
            signed-in accounts.
          </li>
          <li>
            Display, moderate, and improve contributor reports and related trust
            signals.
          </li>
          <li>Respond to questions, support requests, and contact messages.</li>
          <li>
            Protect the site, investigate misuse, troubleshoot issues, and
            understand overall site use.
          </li>
          <li>Comply with legal obligations and enforce our Terms.</li>
        </ul>
      </>
    ),
  },
  {
    id: "sharing-and-outside-services",
    title: "Sharing and external services",
    navLabel: "Sharing and external services",
    content: (
      <>
        <p>
          We may share information with providers that host the site, provide
          account services, process location lookups, deliver messages you ask
          us to send, measure site performance, or protect the site from abuse.
        </p>
        <p>
          We may also disclose information when reasonably necessary to comply
          with law, enforce our terms, or protect PharmaPath, its users, or the
          public.
        </p>
        <p>
          If you follow a map link or another external link, your use of that
          destination is governed by that third party&apos;s own terms and
          privacy practices.
        </p>
      </>
    ),
  },
  {
    id: "retention-and-choices",
    title: "Retention and choices",
    navLabel: "Retention and choices",
    content: (
      <>
        <p>
          We keep information for different periods depending on what it is, why
          it was collected, and our operational or legal needs.
        </p>
        <p>
          Short-term technical caches and abuse-prevention controls may expire
          quickly. Account information, contributor history, and support
          messages may be kept longer while they remain relevant to running,
          protecting, improving, or documenting the service.
        </p>
        <p>
          You can browse public pages without an account, sign out at any time,
          update certain profile settings, and choose whether your contributor
          alias is public. PharmaPath does not currently offer self-service
          account deletion. Privacy questions or requests can be sent through
          the contact options below.
        </p>
      </>
    ),
  },
  {
    id: "security-children-and-updates",
    title: "Security, children, and updates",
    navLabel: "Security and updates",
    content: (
      <>
        <p>
          We use reasonable administrative, technical, and organizational
          measures appropriate to the service, but no internet transmission or
          storage system is completely secure. Use a strong password and avoid
          sending information you would not want transmitted electronically.
        </p>
        <p>
          PharmaPath is not directed to children under 13. If you believe a
          child has provided personal information through the service, contact us
          so we can review the request.
        </p>
        <p>
          We may update this Privacy Policy from time to time. When we do, we
          will revise the last-updated date on this page. Questions can be sent
          through{" "}
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
  title: "Privacy Policy | PharmaPath",
  description:
    "How PharmaPath collects, uses, shares, and retains search information, account information, user reports, contact messages, and technical usage data.",
  alternates: {
    canonical: "https://pharmapath.org/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This Privacy Policy explains how PharmaPath handles search information, account information, user-submitted reports, contact messages, and technical usage data."
      lastUpdated={lastUpdated}
      sections={sections}
      sidebarContent={
        <>
          <p>
            PharmaPath uses search, account, report, contact, and technical
            usage data to run the site and guard against misuse.
          </p>
          <p>
            Searches are not treated as a medical record or a live inventory
            confirmation.
          </p>
        </>
      }
    />
  );
}
