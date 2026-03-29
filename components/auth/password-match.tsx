"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function PasswordMatch({
  password,
  confirmPassword,
  className,
}: {
  password: string;
  confirmPassword: string;
  className?: string;
}) {
  if (!confirmPassword) {
    return null;
  }

  const matches = password === confirmPassword;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-1",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {matches ? (
        <>
          <Check className="h-4 w-4 text-emerald-500" />
          <span className="text-emerald-600">Passwords match</span>
        </>
      ) : (
        <>
          <X className="h-4 w-4 text-rose-500" />
          <span className="text-rose-600">Passwords do not match</span>
        </>
      )}
    </div>
  );
}
