import Link from "next/link";
import { FooterEntry } from "@/components/route-entry";
import { SiteBrand } from "@/components/site-brand";
import { surfaceNames } from "@/lib/surface-labels";

const footerSections = [
  {
    title: "Product",
    links: [
      { label: surfaceNames.patient, href: "/pharmacy-finder" },
      { label: "Pharmacy Results", href: "/pharmacy-finder/results" },
      { label: surfaceNames.prescriber, href: "/prescriber" },
    ],
  },
  {
    title: "Evidence",
    links: [
      { label: "Methodology", href: "/methodology" },
      { label: "Health status", href: "/methodology#health" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Instagram", href: "/connect/instagram" },
      { label: "LinkedIn", href: "/connect/linkedin" },
    ],
  },
  {
    title: "Support",
    links: [{ label: "Contact Us", href: "/contact" }],
  },
];

const footerTextLinkClassName =
  "text-sm text-[#666666] transition-colors duration-150 hover:text-[#202020]";
const footerNavLinkClassName = "nav-link-underline inline-flex w-fit";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#e5e5e5] bg-[#fafafa]">
      <FooterEntry className="site-shell py-16">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <div className="mb-4">
              <SiteBrand
                className="mb-2"
                wordmarkClassName="text-2xl font-medium"
              />
              <p className="max-w-xs text-sm leading-5 text-[#666666]">
                Live nearby pharmacy search with medication access context.
                Guidance is meant to support better pharmacy calls, not
                guarantee stock.
              </p>
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title} className="col-span-1">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-[#202020]">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={
                        section.title === "Connect"
                          ? footerNavLinkClassName
                          : footerTextLinkClassName
                      }
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[#e5e5e5] pt-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <p className="text-sm text-[#666666]">
              © PharmaPath {currentYear}. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className={footerTextLinkClassName}
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className={footerTextLinkClassName}
              >
                Terms
              </Link>
              <Link
                href="/contact"
                className={footerTextLinkClassName}
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </FooterEntry>
    </footer>
  );
}
