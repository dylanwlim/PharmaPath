import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDocumentLayout,
  type LegalDocumentSection,
} from "@/components/legal/legal-document-layout";

const lastUpdated = "April 4, 2026";

const sections: LegalDocumentSection[] = [
  {
    id: "what-pharmapath-is",
    title: "What PharmaPath is",
    summary:
      "This notice describes the current product as implemented today.",
    content: (
      <>
        <p>
          PharmaPath is a medication-access product built to help people make
          better pharmacy calls and medication-planning decisions. The current
          experience includes nearby pharmacy search, medication context,
          Medication Lookup, optional user accounts, contributor
          reports, and a contact form.
        </p>
        <p>
          PharmaPath is not a live inventory feed, and it is not presented as a
          substitute for direct pharmacy confirmation, clinical judgment, or
          emergency care. That boundary matters to how we describe data use
          throughout this page.
        </p>
      </>
    ),
  },
  {
    id: "information-you-provide",
    title: "Information you provide directly",
    summary:
      "The product only asks for information tied to search, account, contributor, or contact flows that exist in the app today.",
    content: (
      <>
        <p>Depending on how you use PharmaPath, you may provide:</p>
        <ul className="space-y-3 pl-5 text-[0.98rem] leading-7 text-slate-600 marker:text-slate-400">
          <li>
            Medication, strength, and location inputs used to run nearby
            pharmacy and medication-context searches.
          </li>
          <li>
            Account information such as name, email address, password, optional
            home ZIP or city, default location label, preferred search radius,
            contributor alias, and profile settings.
          </li>
          <li>
            Contributor report details such as the medication query, pharmacy
            name, pharmacy address, optional pharmacy place identifier or map
            link, report type, and optional note.
          </li>
          <li>
            Contact-form submissions including your name, email address, subject,
            and message.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "automatic-data",
    title: "Technical and automatic data",
    summary:
      "Like most web applications, PharmaPath and its infrastructure receive standard technical metadata when the site is used.",
    content: (
      <>
        <p>
          Our hosting, runtime, analytics, and third-party providers may receive
          information such as IP address, browser type, device characteristics,
          referring URL, timestamps, and request-level diagnostics needed to
          deliver the site and troubleshoot issues.
        </p>
        <p>
          PharmaPath also uses short-lived technical controls in a few places.
          For example, the contact route keeps a temporary in-memory rate-limit
          window keyed to request IP information to reduce abuse, and some live
          location or pharmacy requests may be cached briefly in server memory to
          improve responsiveness and stability.
        </p>
      </>
    ),
  },
  {
    id: "search-location-medication-inputs",
    title: "How search, location, and medication inputs are used",
    summary:
      "The current product uses your search inputs to return nearby routing results and medication context, not to build a clinical record.",
    content: (
      <>
        <p>
          Location inputs are sent to Google-powered location services used by
          the app for autocomplete, place resolution, nearby pharmacy search,
          and map links. Medication queries are used to search PharmaPath’s
          medication index and to request medication-reference context such as
          shortage, recall, approval, formulation, and manufacturer information.
        </p>
        <p>
          Some medication-related inputs can be sensitive in context. In the
          current implementation, PharmaPath treats those inputs as product
          search or contributor inputs rather than as a medical chart, diagnosis
          file, insurance claim, or confirmed pharmacy inventory record.
        </p>
        <p>
          Search responses may be cached in your browser for a short period to
          make repeated loading faster. When you are signed in, the app also
          stores a small recent-search history on your profile so the account
          surface can show your latest searches.
        </p>
      </>
    ),
  },
  {
    id: "accounts-and-contributor-data",
    title: "Account and contributor data handling",
    summary:
      "Signed-in experiences are built on email/password authentication plus a Firestore profile record.",
    content: (
      <>
        <p>
          PharmaPath currently uses Firebase Authentication for email/password
          sign-in and registration. The app can keep a sign-in session in local
          browser persistence or session persistence depending on the remember-me
          choice at sign-in.
        </p>
        <p>
          Profile records can include your display name, email address, city,
          state, ZIP code, default location label, preferred search radius,
          contributor alias, alias visibility setting, notification preferences,
          contribution counts, and recent searches. Crowd reports are stored
          separately and linked to the submitting account.
        </p>
        <p>
          If you choose to keep your contributor alias private, the app is built
          to show a private contributor label instead of your chosen alias on
          future report snapshots.
        </p>
      </>
    ),
  },
  {
    id: "third-party-services",
    title: "Third-party services and infrastructure",
    summary:
      "The services below are reflected in the current codebase and deployed product configuration.",
    content: (
      <>
        <ul className="space-y-3 pl-5 text-[0.98rem] leading-7 text-slate-600 marker:text-slate-400">
          <li>
            <span className="font-medium text-slate-900">Vercel:</span> site
            hosting, deployment delivery, and web analytics.
          </li>
          <li>
            <span className="font-medium text-slate-900">
              Firebase Authentication and Firestore:
            </span>{" "}
            account sign-in and stored profile or contributor data.
          </li>
          <li>
            <span className="font-medium text-slate-900">
              Google location and nearby-pharmacy services:
            </span>{" "}
            autocomplete, place resolution, nearby pharmacy results, and map
            links.
          </li>
          <li>
            <span className="font-medium text-slate-900">openFDA:</span>{" "}
            medication-reference data such as shortage, recall, and approval
            context.
          </li>
          <li>
            <span className="font-medium text-slate-900">Resend:</span> contact
            form email delivery when inline submission is enabled.
          </li>
        </ul>
        <p>
          Those providers have their own privacy practices and terms. External
          links, including map links and any future social destinations, are
          governed by the destination service once you leave PharmaPath.
        </p>
      </>
    ),
  },
  {
    id: "cookies-storage",
    title: "Cookies, session storage, and similar technologies",
    summary:
      "The current product uses browser storage primarily for sign-in state and short-lived search caching.",
    content: (
      <>
        <p>
          PharmaPath does not currently present a user-facing advertising or
          tracking-cookie feature set. The current implementation does use
          browser storage and similar persistence mechanisms to keep account
          sessions available and to cache search responses in the active browser
          session.
        </p>
        <p>
          Third-party providers involved in authentication, analytics, hosting,
          or content delivery may also use cookies, local storage, or similar
          mechanisms as part of their services. If you block certain browser
          storage features, some parts of the signed-in or cached experience may
          not work as intended.
        </p>
      </>
    ),
  },
  {
    id: "how-information-is-used",
    title: "How information is used",
    summary:
      "We use information to operate the current product and keep its boundaries accurate.",
    content: (
      <>
        <p>PharmaPath currently uses information to:</p>
        <ul className="space-y-3 pl-5 text-[0.98rem] leading-7 text-slate-600 marker:text-slate-400">
          <li>Run nearby pharmacy and medication-context searches.</li>
          <li>Maintain accounts, profiles, recent searches, and contributor history.</li>
          <li>Display contributor reports and trust signals inside the product.</li>
          <li>Respond to contact submissions and product questions.</li>
          <li>Detect abuse, rate-limit misuse, and diagnose technical issues.</li>
          <li>Understand site usage at a high level and improve the product.</li>
        </ul>
      </>
    ),
  },
  {
    id: "retention-controls",
    title: "Retention and user controls",
    summary:
      "Retention in the current app depends on the type of data and whether it is browser-side or account-side.",
    content: (
      <>
        <p>
          Browser-side search caches are intentionally short-lived. In the
          current implementation, cached search and medication responses in
          session storage expire on a rolling window measured in minutes, not
          months. Contact-form rate-limit state is also temporary and held in
          memory for a short abuse-prevention window.
        </p>
        <p>
          Signed-in recent searches are limited to a small recent history rather
          than an unlimited archive. Account profile records, contributor
          history, and contact emails may be retained for as long as reasonably
          needed to operate, secure, or improve the service and comply with legal
          obligations. The current product does not yet include a self-service
          account deletion workflow inside the interface.
        </p>
        <p>
          You can browse core public pages without creating an account, sign out
          of an account at any time, adjust profile settings, choose whether
          your contributor alias is public, and contact PharmaPath with privacy
          questions.
        </p>
      </>
    ),
  },
  {
    id: "security-children-updates",
    title: "Security, children’s privacy, and updates to this notice",
    summary:
      "We aim for accurate, conservative language about protection and scope.",
    content: (
      <>
        <p>
          PharmaPath uses reasonable administrative, technical, and product
          measures designed for the service as it exists today, but no online
          system can promise absolute security. You should use a strong password
          and avoid submitting information you would not want transmitted over
          ordinary internet channels.
        </p>
        <p>
          PharmaPath is not directed to children under 13. If you believe a
          child has provided personal information through the current product,
          contact us and we will review the request.
        </p>
        <p>
          We may update this Privacy Policy as the product changes. When we do,
          we will update the last-updated date on this page. For questions, use{" "}
          <Link
            href="/contact"
            className="text-[#156d95] transition-colors duration-150 hover:text-[#0f5d7d]"
          >
            the contact page
          </Link>{" "}
          or email{" "}
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
    "How PharmaPath handles search inputs, accounts, contributor data, contact messages, and current third-party integrations.",
  alternates: {
    canonical: "https://pharmapath.org/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This Privacy Policy explains how PharmaPath handles information in the current product: nearby pharmacy search, medication context, optional accounts, contributor reports, and direct contact."
      lastUpdated={lastUpdated}
      sections={sections}
      sidebarContent={
        <>
          <p>
            PharmaPath is built to help with better pharmacy calls and clearer
            medication-access context. It is not a live inventory guarantee and
            it is not presented as medical advice.
          </p>
          <p>
            The current implementation includes Google-powered location and
            nearby pharmacy services, openFDA medication-reference lookups,
            Firebase accounts and Firestore profile data, Vercel Analytics, and
            Resend-powered contact delivery when configured.
          </p>
          <p>
            Questions can be sent through{" "}
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
      }
    />
  );
}
