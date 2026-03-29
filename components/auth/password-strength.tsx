"use client";

import { cn } from "@/lib/utils";

function calculateStrength(password: string): { score: number; label: string; color: string } {
  if (!password) {
    return { score: 0, label: "", color: "" };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  const normalizedScore = Math.min(4, Math.floor((score * 4) / 6));
  const levels = [
    { label: "Very weak", color: "bg-rose-500" },
    { label: "Weak", color: "bg-orange-500" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: "bg-emerald-400" },
    { label: "Strong", color: "bg-emerald-500" },
  ];

  return { score: normalizedScore, ...levels[normalizedScore] };
}

export function PasswordStrength({ password }: { password: string }) {
  const { score, label, color } = calculateStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              index <= score ? color : "bg-slate-200",
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          "text-xs transition-colors duration-200",
          score <= 1 ? "text-rose-600" : score <= 2 ? "text-amber-600" : "text-emerald-600",
        )}
      >
        {label}
      </p>
    </div>
  );
}
