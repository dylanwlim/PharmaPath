"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MedicationCombobox } from "@/components/search/medication-combobox";
import {
  resolveMedicationOption,
  type MedicationSearchOption,
} from "@/lib/medications/client";

export function MedicationQueryForm({
  action,
  initialQuery = "",
  submitLabel,
  helper,
}: {
  action: string;
  initialQuery?: string;
  submitLabel: string;
  helper: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedOption, setSelectedOption] = useState<MedicationSearchOption | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    setSelectedOption(null);
    setQuery(initialQuery);
  }, [initialQuery]);

  return (
    <form
      className="surface-panel rounded-[2rem] p-5 sm:p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsResolving(true);
        try {
          const resolvedOption = selectedOption || (await resolveMedicationOption(query));
          setError(
            resolvedOption ? null : "Choose a medication from the FDA-backed search results.",
          );

          if (!resolvedOption) {
            return;
          }

          setSelectedOption(resolvedOption);
          setQuery(resolvedOption.label);
          const params = new URLSearchParams({ query: resolvedOption.value.trim() });
          startTransition(() => {
            router.push(`${action}?${params.toString()}`);
          });
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : "Unable to search medications right now.");
        } finally {
          setIsResolving(false);
        }
      }}
    >
      <MedicationCombobox
        label="Medication"
        placeholder="Search FDA-backed medications"
        value={query}
        selectedOptionId={selectedOption?.id || null}
        onValueChange={(nextValue) => {
          setQuery(nextValue);
          setError(null);

          if (
            selectedOption &&
            nextValue.trim().toLowerCase() !== selectedOption.label.trim().toLowerCase()
          ) {
            setSelectedOption(null);
          }
        }}
        onSelect={(option) => {
          setSelectedOption(option);
          setQuery(option.label);
          setError(null);
        }}
        emptyMessage="No FDA-backed medications match that search yet."
        error={error}
      />

      <p className="mt-4 text-sm leading-6 text-slate-600">{helper}</p>

      <button
        type="submit"
        disabled={isPending || isResolving}
        className="template-button-primary mt-5 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending || isResolving ? "Loading..." : submitLabel}
      </button>
    </form>
  );
}
