import type { ReactNode } from "react";

export function PageTransitionShell({
  children,
}: {
  children: ReactNode;
}) {
  return <main className="page-shell-enter">{children}</main>;
}
