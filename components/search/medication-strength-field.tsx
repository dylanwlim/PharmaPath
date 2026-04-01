"use client";

import { useId } from "react";
import type { MedicationSearchOption } from "@/lib/medications/client";
import { cn } from "@/lib/utils";

export function MedicationStrengthField({
  option,
  value,
  onChange,
  error,
  className,
  showWhenEmpty = false,
}: {
  option: MedicationSearchOption | null;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  className?: string;
  showWhenEmpty?: boolean;
}) {
  const helperId = useId();

  if (!option && !showWhenEmpty) {
    return null;
  }

  const strengths = option?.strengths || [];
  const hasMultipleStrengths = strengths.length > 1;
  const helper = option
    ? option.demoOnly
      ? `Simulated demo medication • ${option.simulatedUserCount || 0} seeded demo users`
      : [option.formulation, option.dosageForm].filter(Boolean).join(" • ")
    : "Strength options appear after a medication match.";

  return (
    <label className={cn("search-field-stack", className)}>
      <span className="search-field-label">Strength</span>
      <select
        className={cn(
          "search-select-control",
          error && "border-rose-300 ring-4 ring-rose-500/10",
        )}
        value={value}
        disabled={!option}
        aria-describedby={helper ? helperId : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {!option ? <option value="">Select strength…</option> : null}
        {option && hasMultipleStrengths ? <option value="">Select strength</option> : null}
        {strengths.map((strength) => (
          <option key={strength.id} value={strength.value}>
            {strength.label}
          </option>
        ))}
      </select>
      <div className="search-field-helper-slot">
        {helper ? (
          <p
            id={helperId}
            className={cn(
              "search-field-helper",
              !option && "text-slate-400",
            )}
          >
            {helper}
          </p>
        ) : null}
        {error ? <p className="search-field-error">{error}</p> : null}
      </div>
    </label>
  );
}
