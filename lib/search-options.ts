export type SearchOption = {
  id: string;
  label: string;
  value: string;
  description: string;
  keywords?: string[];
  badge?: string;
};

export type SearchScenario = {
  id: string;
  label: string;
  medication: string;
  location: string;
  description: string;
};

export const locationOptions: SearchOption[] = [
  {
    id: "brooklyn-ny",
    label: "Brooklyn, NY",
    value: "Brooklyn, NY",
    description: "City + state",
    keywords: ["brooklyn", "new york", "nyc"],
  },
  {
    id: "brooklyn-11201",
    label: "Brooklyn, NY 11201",
    value: "Brooklyn, NY 11201",
    description: "ZIP-backed entry",
    keywords: ["11201", "downtown brooklyn", "brooklyn zip"],
    badge: "ZIP",
  },
  {
    id: "queens-ny",
    label: "Queens, NY",
    value: "Queens, NY",
    description: "City + state",
    keywords: ["queens", "new york", "nyc"],
  },
  {
    id: "queens-11375",
    label: "Queens, NY 11375",
    value: "Queens, NY 11375",
    description: "ZIP-backed entry",
    keywords: ["11375", "forest hills", "queens zip"],
    badge: "ZIP",
  },
  {
    id: "lower-manhattan-ny",
    label: "Lower Manhattan, NY",
    value: "Lower Manhattan, NY",
    description: "Neighborhood + city",
    keywords: ["lower manhattan", "manhattan", "nyc", "tribeca", "soho"],
  },
  {
    id: "lower-manhattan-10013",
    label: "Lower Manhattan, NY 10013",
    value: "Lower Manhattan, NY 10013",
    description: "ZIP-backed entry",
    keywords: ["10013", "tribeca", "soho", "lower manhattan zip"],
    badge: "ZIP",
  },
  {
    id: "hoboken-nj",
    label: "Hoboken, NJ",
    value: "Hoboken, NJ",
    description: "City + state",
    keywords: ["hoboken", "new jersey", "nj"],
  },
  {
    id: "hoboken-07030",
    label: "Hoboken, NJ 07030",
    value: "Hoboken, NJ 07030",
    description: "ZIP-backed entry",
    keywords: ["07030", "hoboken zip", "new jersey"],
    badge: "ZIP",
  },
  {
    id: "jersey-city-nj",
    label: "Jersey City, NJ",
    value: "Jersey City, NJ",
    description: "City + state",
    keywords: ["jersey city", "new jersey", "nj"],
  },
  {
    id: "jersey-city-07302",
    label: "Jersey City, NJ 07302",
    value: "Jersey City, NJ 07302",
    description: "ZIP-backed entry",
    keywords: ["07302", "jersey city zip", "new jersey"],
    badge: "ZIP",
  },
];

export const searchScenarios: SearchScenario[] = [
  {
    id: "controlled-stimulant",
    label: "Controlled stimulant",
    medication: "Adderall XR 20 mg",
    location: "Brooklyn, NY",
    description:
      "A higher-friction handoff where the nearby list stays live and the medication context stays explicit.",
  },
  {
    id: "glp-1-refill",
    label: "GLP-1 refill",
    medication: "Wegovy 0.25 mg/0.5 ml",
    location: "Queens, NY",
    description:
      "Useful for shipment-sensitive questions without implying a specific dose is on the shelf.",
  },
  {
    id: "same-day-antibiotic",
    label: "Same-day antibiotic",
    medication: "Amoxicillin 500 mg capsule",
    location: "Hoboken, NJ",
    description:
      "A speed-sensitive path where open status and short travel time matter more than a perfect score.",
  },
  {
    id: "routine-refill",
    label: "Routine refill",
    medication: "Sertraline 50 mg tablet",
    location: "Lower Manhattan, NY",
    description:
      "A steadier refill flow that still keeps transfer timing and confirmation separate from inventory claims.",
  },
];

export function normalizeSearchOptionText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugifyValue(value: string) {
  return normalizeSearchOptionText(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function findSupportedOption(options: readonly SearchOption[], value: string) {
  const normalizedValue = normalizeSearchOptionText(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    options.find((option) => {
      const haystack = [option.label, option.value];
      return haystack.some((entry) => normalizeSearchOptionText(entry) === normalizedValue);
    }) || null
  );
}

export function resolveInitialOption(options: readonly SearchOption[], value: string) {
  const exactOption = findSupportedOption(options, value);

  if (exactOption) {
    return exactOption;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  return {
    id: `existing-${slugifyValue(trimmedValue)}`,
    label: trimmedValue,
    value: trimmedValue,
    description: "Existing search value",
  } satisfies SearchOption;
}
