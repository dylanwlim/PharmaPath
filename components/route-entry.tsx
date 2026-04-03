"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PageEntry({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <main key={`page:${pathname}`} className={cn("page-shell-enter", className)}>
      {children}
    </main>
  );
}

export function FooterEntry({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div key={`footer:${pathname}`} className={cn("site-footer-enter", className)}>
      {children}
    </div>
  );
}
