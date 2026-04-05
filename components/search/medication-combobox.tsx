"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, LoaderCircle } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  startTransition,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import {
  getComboboxPanelPositionClasses,
  useComboboxPanelLayout,
} from "@/components/search/combobox-shared";
import {
  getMedicationSearchPreview,
  normalizeMedicationSearchQuery,
  prewarmMedicationSearch,
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
  helperText?: string | null;
  error?: string | null;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  panelMode?: "floating" | "inline";
  inputClassName?: string;
  panelClassName?: string;
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
  helperText,
  error,
  className,
  inputRef,
  panelMode = "floating",
  inputClassName,
  panelClassName,
}: MedicationComboboxProps) {
  const reduceMotion = useReducedMotion();
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [options, setOptions] = useState<MedicationSearchOption[]>([]);
  const [highlightedIndexState, setHighlightedIndexState] = useState(0);
  const normalizedValue = normalizeMedicationSearchQuery(value);
  const hasTypedQuery = normalizedValue.length > 0;
  const needsMoreCharacters =
    hasTypedQuery && normalizedValue.length < 2;
  const isSearchable = normalizedValue.length >= 2;
  const effectiveLoadState: LoadState =
    !isOpen || !isSearchable ? "idle" : loadState;
  const visibleOptions = useMemo(
    () => (isOpen && isSearchable ? options : []),
    [isOpen, isSearchable, options],
  );
  const { placement, maxHeight } = useComboboxPanelLayout(
    wrapperRef,
    isOpen,
    320,
  );
  const highlightedIndex = useMemo(() => {
    if (!visibleOptions.length) {
      return 0;
    }

    const selectedIndex = visibleOptions.findIndex(
      (option) => option.id === selectedOptionId,
    );
    if (selectedIndex >= 0) {
      return selectedIndex;
    }

    return Math.min(highlightedIndexState, visibleOptions.length - 1);
  }, [highlightedIndexState, selectedOptionId, visibleOptions]);

  useEffect(() => {
    void prewarmMedicationSearch();
  }, []);

  useEffect(() => {
    if (!isOpen || !isSearchable) {
      return;
    }

    const preview = getMedicationSearchPreview(normalizedValue, {
      limit: 8,
    });
    const previewQuery =
      preview ? normalizeMedicationSearchQuery(preview.query) : null;
    const hasExactPreview = previewQuery === normalizedValue;
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      searchMedicationIndex(normalizedValue, {
        limit: 8,
        signal: abortController.signal,
      })
        .then((response) => {
          if (abortController.signal.aborted) {
            return;
          }

          startTransition(() => {
            setOptions(response.results);
            setLoadError(null);
            setLoadState("ready");
          });
        })
        .catch((reason: Error) => {
          if (abortController.signal.aborted) {
            return;
          }

          startTransition(() => {
            if (!preview?.results.length) {
              setOptions([]);
            }
            setLoadError(reason.message);
            setLoadState(preview?.results.length ? "ready" : "error");
          });
        });
    }, hasExactPreview ? 0 : preview?.results.length ? 60 : 100);

    startTransition(() => {
      if (preview?.results.length) {
        setOptions(preview.results);
      } else {
        setOptions([]);
      }
      setLoadError(null);
      setLoadState(hasExactPreview ? "ready" : "loading");
    });

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [isOpen, isSearchable, normalizedValue]);

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
    const activeOption = visibleOptions[highlightedIndex];
    if (!isOpen || !activeOption) {
      return;
    }

    const element = document.getElementById(`${listboxId}-${activeOption.id}`);
    element?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isOpen, listboxId, visibleOptions]);

  const activeOption = visibleOptions[highlightedIndex] || null;
  const describedBy = [helperText ? helperId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndexState((currentIndex) =>
        visibleOptions.length ? (currentIndex + 1) % visibleOptions.length : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndexState((currentIndex) =>
        visibleOptions.length
          ? (currentIndex - 1 + visibleOptions.length) % visibleOptions.length
          : 0,
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
    <label className={cn("search-field-stack", className)}>
      <span className="search-field-label">{label}</span>
      <div ref={wrapperRef} className="relative">
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={activeOption ? `${listboxId}-${activeOption.id}` : undefined}
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className={cn(
            "search-field-input pr-12",
            isOpen && "border-[#156d95] ring-4 ring-[#156d95]/10",
            error && "border-rose-300 ring-4 ring-rose-500/10",
            inputClassName,
          )}
          placeholder={placeholder}
          title={value || placeholder}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsOpen(true);
            setHighlightedIndexState(0);
          }}
          onClick={() => setIsOpen(true)}
          onFocus={() => {
            void prewarmMedicationSearch();
          }}
          onKeyDown={handleKeyDown}
        />

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2 pr-4">
          {effectiveLoadState === "loading" ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" />
          ) : null}
          <ChevronDown
            className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")}
          />
        </div>

        <AnimatePresence initial={false}>
          {isOpen ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -4, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.985 }}
              transition={
                reduceMotion
                  ? { duration: 0.12 }
                  : { duration: 0.16, ease: [0.22, 1, 0.36, 1] }
              }
              className={cn(
                panelMode === "floating"
                  ? "search-floating-panel"
                  : "search-inline-panel mt-1.5",
                panelMode === "floating" &&
                  getComboboxPanelPositionClasses(placement),
                panelClassName,
              )}
            >
              <div
                id={listboxId}
                role="listbox"
                className="search-floating-scroll space-y-1"
                style={{ maxHeight: panelMode === "floating" ? maxHeight : 296 }}
              >
                {effectiveLoadState === "error" ? (
                  <div className="rounded-[0.9rem] border border-dashed border-rose-200 bg-rose-50/85 px-3.5 py-3 text-sm leading-6 text-rose-700">
                    {loadError || "Unable to load medication matches right now."}
                  </div>
                ) : !hasTypedQuery ? (
                  <div className="rounded-[0.9rem] border border-slate-200/80 bg-slate-50/82 px-3.5 py-3 text-sm leading-6 text-slate-600">
                    Start typing a brand, generic, or strength to load medication matches.
                  </div>
                ) : needsMoreCharacters ? (
                  <div className="rounded-[0.9rem] border border-dashed border-slate-200 bg-slate-50/82 px-3.5 py-3 text-sm leading-6 text-slate-500">
                    Type at least 2 characters to load medication matches.
                  </div>
                ) : effectiveLoadState === "loading" && !visibleOptions.length ? (
                  <div
                    aria-live="polite"
                    className="rounded-[0.9rem] border border-dashed border-slate-200 bg-slate-50/82 px-3.5 py-3 text-sm leading-6 text-slate-500"
                  >
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Matching medications...
                    </span>
                  </div>
                ) : visibleOptions.length ? (
                  <>
                    {effectiveLoadState === "loading" ? (
                      <div className="rounded-[0.9rem] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-[0.73rem] leading-5 text-slate-500">
                        Showing cached matches while newer results load.
                      </div>
                    ) : null}
                    {visibleOptions.map((option, index) => {
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
                            "flex w-full items-start justify-between gap-3 rounded-[0.88rem] border px-3 py-2.5 text-left transition-[background-color,border-color,transform] duration-150",
                            isHighlighted
                              ? "border-[#156d95]/22 bg-[#156d95]/9"
                              : "border-transparent hover:border-slate-200/85 hover:bg-slate-50/90",
                            isSelected &&
                              !isHighlighted &&
                              "border-slate-200/85 bg-slate-100/90",
                          )}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setHighlightedIndexState(index)}
                          onClick={() => {
                            onSelect(option);
                            setIsOpen(false);
                          }}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-start gap-2">
                              <span className="min-w-0 flex-1 break-words text-sm font-medium leading-5 text-slate-900">
                                {option.label}
                              </span>
                              {option.badge ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  {option.badge}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 break-words text-[0.72rem] leading-5 text-slate-500">
                              {option.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <div className="rounded-[0.9rem] border border-dashed border-slate-200 bg-slate-50/82 px-3.5 py-3 text-sm leading-6 text-slate-500">
                    {emptyMessage}
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="search-field-helper-slot">
        {helperText ? (
          <p id={helperId} className="search-field-helper line-clamp-2">
            {helperText}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className="search-field-error">
            {error}
          </p>
        ) : null}
      </div>
    </label>
  );
}
