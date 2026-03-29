import type { ReactNode } from "react";
import { AuthLayoutShell } from "@/components/auth/auth-layout-shell";

export default function AuthRouteLayout({ children }: { children: ReactNode }) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
