"use client";

import { ChevronDown, LoaderCircle } from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  searchMedicationIndex,
  type MedicationSearchOption,
} from "@/lib/medications/client";
import { cn } from "@/lib/utils";

type MedicationComboboxProps = {
  label: string;
  placeholder: string;
  value: string;
  selectedOptionId?: string | null;
  onValueChange: (value: string) => void;
  onSelect: (option: MedicationSearchOption) => void;
  emptyMessage: string;
  error?: string | null;
};

type LoadState = "idle" | "loading" | "ready" | "error";

export function MedicationCombobox({
  label,
  placeholder,
  value,
  selectedOptionId,
  onValueChange,
  onSelect,
  emptyMessage,
  error,
}: MedicationComboboxProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const deferredValue = useDeferredValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [options, setOptions] = useState<MedicationSearchOption[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const abortController = new AbortController();
    setLoadState("loading");
    setLoadError(null);

    searchMedicationIndex(deferredValue, {
      limit: 8,
      signal: abortController.signal,
    })
      .then((response) => {
        if (abortController.signal.aborted) {
          return;
        }

        setOptions(response.results);
        setLoadState("ready");
      })
      .catch((reason: Error) => {
        if (abortController.signal.aborted) {
          return;
        }

        setOptions([]);
        setLoadState("error");
        setLoadError(reason.message);
      });

    return () => abortController.abort();
  }, [deferredValue, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const selectedIndex = options.findIndex((option) => option.id === selectedOptionId);
    setHighlightedIndex((currentIndex) => {
      if (!options.length) {
        return 0;
      }

      if (selectedIndex >= 0) {
        return selectedIndex;
      }

      return Math.min(currentIndex, options.length - 1);
    });
  }, [isOpen, options, selectedOptionId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    const activeOption = options[highlightedIndex];
    if (!isOpen || !activeOption) {
      return;
    }

    const element = document.getElementById(`${listboxId}-${activeOption.id}`);
    element?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isOpen, listboxId, options]);

  const activeOption = options[highlightedIndex] || null;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((currentIndex) => (options.length ? (currentIndex + 1) % options.length : 0));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((currentIndex) =>
        options.length ? (currentIndex - 1 + options.length) % options.length : 0,
      );
      return;
    }

    if (event.key === "Enter" && isOpen && activeOption) {
      event.preventDefault();
      onSelect(activeOption);
      setIsOpen(false);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <label className="space-y-2">
      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <div ref={wrapperRef} className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={activeOption ? `${listboxId}-${activeOption.id}` : undefined}
          autoComplete="off"
          className={cn(
            "search-field-input pr-12",
            isOpen && "border-[#156d95] ring-4 ring-[#156d95]/10",
            error && "border-rose-300 ring-4 ring-rose-500/10",
          )}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsOpen(true);
          }}
          onClick={() => setIsOpen(true)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2 pr-4">
          {loadState === "loading" ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" />
          ) : null}
          <ChevronDown
            className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")}
          />
        </div>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white/96 shadow-[0_22px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div id={listboxId} role="listbox" className="max-h-72 space-y-1 overflow-y-auto p-2">
              {loadState === "error" ? (
                <div className="rounded-[1rem] border border-dashed border-rose-200 bg-rose-50/85 px-4 py-4 text-sm leading-6 text-rose-700">
                  {loadError || "Unable to load medication matches right now."}
                </div>
              ) : loadState === "loading" && !options.length ? (
                <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/85 px-4 py-4 text-sm leading-6 text-slate-500">
                  Loading medication matches...
                </div>
              ) : options.length ? (
                options.map((option, index) => {
                  const isSelected = option.id === selectedOptionId;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <button
                      key={option.id}
                      id={`${listboxId}-${option.id}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full items-start justify-between gap-4 rounded-[1rem] border px-3 py-3 text-left transition-colors duration-150",
                        isHighlighted
                          ? "border-[#156d95]/18 bg-[#156d95]/8"
                          : "border-transparent hover:bg-slate-100/80",
                        isSelected && !isHighlighted && "bg-slate-100/90",
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => {
                        onSelect(option);
                        setIsOpen(false);
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-900">
                            {option.label}
                          </span>
                          {option.badge ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {option.badge}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/85 px-4 py-4 text-sm leading-6 text-slate-500">
                  {emptyMessage}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm leading-6 text-rose-600">{error}</p> : null}
    </label>
  );
}
