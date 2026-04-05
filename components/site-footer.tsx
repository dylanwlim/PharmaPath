"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FooterEntry } from "@/components/route-entry";
import { SiteBrand } from "@/components/site-brand";
import { surfaceNames } from "@/lib/surface-labels";

const pharmacyFinderFooterHref = "/pharmacy-finder";
const pharmacyResultsFooterHref = "/pharmacy-finder/results";
const methodologyFooterHref = "/methodology";
const claimBoundaryFooterHref = "/methodology#claim-boundary";

type FooterLinkItem = {
  label: string;
  href: string;
  activePrefixes?: string[];
  exact?: boolean;
};

type FooterSection = {
  title: string;
  links: FooterLinkItem[];
};

const footerSections: FooterSection[] = [
  {
    title: "Product",
    links: [
      {
        label: surfaceNames.patient,
        href: pharmacyFinderFooterHref,
        exact: true,
      },
      {
        label: "Pharmacy Results",
        href: pharmacyResultsFooterHref,
        activePrefixes: ["/pharmacy-finder/results"],
      },
      { label: surfaceNames.prescriber, href: "/prescriber" },
    ],
  },
  {
    title: "Evidence",
    links: [
      { label: "Methodology", href: methodologyFooterHref, exact: true },
      {
        label: "Claim Boundary",
        href: claimBoundaryFooterHref,
        activePrefixes: ["/methodology"],
      },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Instagram", href: "/connect/instagram" },
      { label: "LinkedIn", href: "/connect/linkedin" },
    ],
  },
];

const footerMetaLinks: FooterLinkItem[] = [
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function FooterLink({
  href,
  label,
  pathname,
  activePrefixes,
  exact,
}: {
  href: string;
  label: string;
  pathname: string;
  activePrefixes?: string[];
  exact?: boolean;
}) {
  const isActive = activePrefixes?.length
    ? activePrefixes.some((prefix) => matchesPrefix(pathname, prefix))
    : exact
      ? pathname === href
      : !href.includes("#") && matchesPrefix(pathname, href);

  return (
    <Link
      href={href}
      data-active={isActive ? "true" : "false"}
      className="footer-link"
    >
      {label}
    </Link>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#e5e5e5] bg-[#fafafa]">
      <FooterEntry className="site-shell py-11 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(19rem,27rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="max-w-[27rem]">
            <SiteBrand
              className="mb-3"
              wordmarkClassName="text-[1.72rem] font-medium tracking-tight"
            />
            <p className="max-w-[26.5rem] text-sm leading-6 text-[#666666]">
              Live nearby pharmacy search with medication access context.
              Guidance is meant to support better pharmacy calls, not guarantee
              stock.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 sm:gap-x-7 sm:gap-y-8 lg:gap-x-8">
            {footerSections.map((section) => (
              <div key={section.title} className="min-w-0">
                <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#202020]">
                  {section.title}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink
                        href={link.href}
                        label={link.label}
                        pathname={pathname}
                        activePrefixes={link.activePrefixes}
                        exact={link.exact}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-[#e5e5e5] pt-5 sm:mt-9 sm:pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#666666]">
              © PharmaPath {currentYear}. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {footerMetaLinks.map((link) => (
                <FooterLink
                  key={link.label}
                  href={link.href}
                  label={link.label}
                  pathname={pathname}
                  activePrefixes={link.activePrefixes}
                  exact={link.exact}
                />
              ))}
            </div>
          </div>
        </div>
      </FooterEntry>
    </footer>
  );
}
