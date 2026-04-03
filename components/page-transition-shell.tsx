import type { ReactNode } from "react";
import { PageEntry } from "@/components/route-entry";

export function PageTransitionShell({
  children,
}: {
  children: ReactNode;
}) {
  return <PageEntry>{children}</PageEntry>;
}
