import Link from "next/link";
import { cn } from "@/lib/utils";

export function SiteBrand({
  href = "/",
  className,
  wordmarkClassName,
}: {
  href?: string;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center text-slate-950 transition-colors duration-200 hover:text-[#156d95]",
        className,
      )}
    >
      <span className={cn("text-2xl font-semibold tracking-tight", wordmarkClassName)}>
        PharmaPath
      </span>
    </Link>
  );
}
