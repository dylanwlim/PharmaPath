"use client";

import { useEffect, useState } from "react";

type LegalTableOfContentsSection = {
  id: string;
  title: string;
  navLabel?: string;
};

type LegalTableOfContentsProps = {
  sections: LegalTableOfContentsSection[];
};

function getScrollOffset() {
  const rootStyles = getComputedStyle(document.documentElement);
  const rootFontSize = Number.parseFloat(rootStyles.fontSize) || 16;
  const navbarHeightValue = rootStyles.getPropertyValue("--navbar-height").trim();
  const parsedNavbarHeight = Number.parseFloat(navbarHeightValue || "5rem") || 5;
  const navbarHeight = navbarHeightValue.endsWith("px")
    ? parsedNavbarHeight
    : parsedNavbarHeight * rootFontSize;
  return navbarHeight + 44;
}

export function LegalTableOfContents({
  sections,
}: LegalTableOfContentsProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (!sections.length) {
      return undefined;
    }

    let frame = 0;

    const updateActiveSection = () => {
      const offset = getScrollOffset();
      let currentSectionId = sections[0].id;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (!element) {
          continue;
        }

        const top = element.getBoundingClientRect().top;
        if (top - offset <= 0) {
          currentSectionId = section.id;
          continue;
        }

        break;
      }

      const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      const hashTarget = sections.find((section) => section.id === hashId);
      if (hashTarget) {
        const element = document.getElementById(hashTarget.id);
        const top = element?.getBoundingClientRect().top;
        if (
          typeof top === "number" &&
          top >= offset - 8 &&
          top <= window.innerHeight * 0.55
        ) {
          currentSectionId = hashTarget.id;
        }
      }

      setActiveId(currentSectionId);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateActiveSection);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
    };
  }, [sections]);

  return (
    <nav aria-label="Table of contents" className="mt-3.5 flex flex-col gap-1.5">
      {sections.map((section) => {
        const isCurrent = activeId === section.id;

        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={isCurrent ? "location" : undefined}
            onClick={() => setActiveId(section.id)}
            className={`group flex items-start gap-2.5 rounded-[0.95rem] border px-3 py-2.5 text-[0.89rem] leading-[1.35] transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#156d95]/10 ${
              isCurrent
                ? "border-slate-200 bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                : "border-transparent text-slate-600 hover:border-slate-200/90 hover:bg-white hover:text-slate-950"
            }`}
          >
            <span
              className={`mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-150 ${
                isCurrent ? "bg-[#156d95]" : "bg-slate-300 group-hover:bg-[#156d95]"
              }`}
            />
            <span className="min-w-0 text-balance">
              {section.navLabel || section.title}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
