import {
  CROWD_REPORT_TYPES,
  type CrowdReportRecord,
  type CrowdSignalSummary,
} from "@/lib/crowd-signal/model";

const REPORT_TYPE_INDEX = Object.fromEntries(
  CROWD_REPORT_TYPES.map((type) => [type.id, type]),
) as Record<(typeof CROWD_REPORT_TYPES)[number]["id"], (typeof CROWD_REPORT_TYPES)[number]>;

const REPORT_HALF_LIFE_HOURS = 72;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundTo(value: number, decimals = 3) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

export function computeTrustWeight(contributionCount: number) {
  const safeCount = Math.max(0, contributionCount);
  const weight = 0.06 + 0.72 * (1 - Math.exp(-safeCount / 18));
  return roundTo(clamp(weight, 0.06, 0.78));
}

export function getTrustTier(contributionCount: number) {
  if (contributionCount >= 25) {
    return {
      label: "Established contributor",
      shortLabel: "Established",
    };
  }

  if (contributionCount >= 10) {
    return {
      label: "Trusted contributor",
      shortLabel: "Trusted",
    };
  }

  if (contributionCount >= 3) {
    return {
      label: "Building contributor",
      shortLabel: "Building",
    };
  }

  return {
    label: "Emerging contributor",
    shortLabel: "Emerging",
  };
}

export function normalizeMedicationKey(query: string) {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/%.\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractStrengthDescriptor(query: string) {
  const match = query.match(/(\d+(?:\.\d+)?)\s?(mg|mcg|g|ml|iu|units?|%)/i);
  return match ? `${match[1]} ${match[2].toLowerCase()}` : null;
}

export function extractFormulationDescriptor(query: string) {
  const lower = query.toLowerCase();
  const tokens = [
    "xr",
    "er",
    "ir",
    "xl",
    "tablet",
    "capsule",
    "solution",
    "suspension",
    "injection",
    "pen",
    "patch",
  ];

  const match = tokens.find((token) => lower.includes(token));
  return match ? match.toUpperCase() : null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildPharmacyKey({
  placeId,
  pharmacyName,
  pharmacyAddress,
}: {
  placeId?: string | null;
  pharmacyName: string;
  pharmacyAddress: string;
}) {
  return placeId?.trim() || slugify(`${pharmacyName}-${pharmacyAddress}`);
}

export function buildSignalKey({
  medicationQuery,
  placeId,
  pharmacyName,
  pharmacyAddress,
}: {
  medicationQuery: string;
  placeId?: string | null;
  pharmacyName: string;
  pharmacyAddress: string;
}) {
  return `${buildPharmacyKey({ placeId, pharmacyName, pharmacyAddress })}::${normalizeMedicationKey(
    medicationQuery,
  )}`;
}

function hoursSince(date: Date | null) {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60));
}

function formatFreshnessNote(date: Date | null) {
  if (!date) {
    return "No recent reports yet";
  }

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

  if (diffHours < 24) {
    return `Latest report ${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `Latest report ${diffDays}d ago`;
}

export function computeCrowdSignal(
  signalKey: string,
  reports: CrowdReportRecord[],
): CrowdSignalSummary {
  if (!reports.length) {
    return {
      signalKey,
      label: "Not enough crowd data",
      status: "not_enough_data",
      confidenceLabel: "Low confidence",
      likelihood: 50,
      confidence: 0,
      agreement: 0,
      reportCount: 0,
      lastReportedAt: null,
      positiveWeight: 0,
      negativeWeight: 0,
      explanation: "No contributor reports have been submitted for this pharmacy and medication yet.",
      freshnessNote: "No recent reports yet",
      mixedSignal: false,
    };
  }

  const sortedReports = [...reports].sort((left, right) => {
    const leftTime = left.createdAt?.getTime() || 0;
    const rightTime = right.createdAt?.getTime() || 0;
    return rightTime - leftTime;
  });

  let signedWeight = 0;
  let absoluteWeight = 0;
  let positiveWeight = 0;
  let negativeWeight = 0;

  sortedReports.forEach((report) => {
    const reportType = REPORT_TYPE_INDEX[report.reportType];
    if (!reportType) {
      return;
    }

    const freshnessWeight = 0.5 ** (hoursSince(report.createdAt) / REPORT_HALF_LIFE_HOURS);
    const trustWeight = clamp(
      report.reporterTrustWeight || computeTrustWeight(report.reporterContributionCount),
      0.05,
      0.8,
    );
    const weightedSignal = reportType.signal * reportType.reliability * freshnessWeight * trustWeight;

    signedWeight += weightedSignal;
    absoluteWeight += Math.abs(weightedSignal);

    if (weightedSignal >= 0) {
      positiveWeight += weightedSignal;
    } else {
      negativeWeight += Math.abs(weightedSignal);
    }
  });

  const normalizedScore = absoluteWeight > 0 ? signedWeight / absoluteWeight : 0;
  const agreement = absoluteWeight > 0 ? Math.abs(signedWeight) / absoluteWeight : 0;
  const evidenceFactor = 1 - Math.exp(-absoluteWeight / 1.4);
  const freshestAgeHours = hoursSince(sortedReports[0]?.createdAt || null);
  const recencyFactor = clamp(0.5 ** (freshestAgeHours / 120), 0.18, 1);
  const confidence = clamp((agreement * 0.55 + evidenceFactor * 0.45) * (0.65 + recencyFactor * 0.35), 0, 1);
  const likelihood = Math.round(((normalizedScore + 1) / 2) * 100);

  const notEnoughData = reports.length < 2 || absoluteWeight < 0.2;
  const mixedSignal = !notEnoughData && (agreement < 0.4 || confidence < 0.42 || (likelihood > 42 && likelihood < 58));

  let status: CrowdSignalSummary["status"] = "mixed_signal";
  let label = "Mixed signal";
  let explanation = "Recent contributor reports are split, so the crowd signal should be treated cautiously.";

  if (notEnoughData) {
    status = "not_enough_data";
    label = "Not enough crowd data";
    explanation =
      "There are not enough weighted reports yet to move this pharmacy’s availability estimate with confidence.";
  } else if (mixedSignal) {
    status = "mixed_signal";
    label = "Mixed signal";
    explanation =
      "Fresh or higher-trust reports disagree with one another, which lowers confidence even if the latest report is positive or negative.";
  } else if (likelihood >= 58) {
    status = "likely_in_stock";
    label = "Likely in stock";
    explanation =
      "Recent weighted reports lean positive for this pharmacy and medication, but direct confirmation is still recommended before sending someone there.";
  } else {
    status = "likely_unavailable";
    label = "Likely unavailable";
    explanation =
      "Recent weighted reports lean negative for this pharmacy and medication, so the app is flagging a higher risk of an unsuccessful fill.";
  }

  const confidenceLabel =
    confidence >= 0.72 ? "High confidence" : confidence >= 0.45 ? "Medium confidence" : "Low confidence";

  return {
    signalKey,
    label,
    status,
    confidenceLabel,
    likelihood,
    confidence: roundTo(confidence, 3),
    agreement: roundTo(agreement, 3),
    reportCount: reports.length,
    lastReportedAt: sortedReports[0]?.createdAt || null,
    positiveWeight: roundTo(positiveWeight, 3),
    negativeWeight: roundTo(negativeWeight, 3),
    explanation,
    freshnessNote: formatFreshnessNote(sortedReports[0]?.createdAt || null),
    mixedSignal,
  };
}

export function buildCrowdSignalMap(reports: CrowdReportRecord[]) {
  const grouped = new Map<string, CrowdReportRecord[]>();

  reports.forEach((report) => {
    const existing = grouped.get(report.signalKey) || [];
    existing.push(report);
    grouped.set(report.signalKey, existing);
  });

  return Object.fromEntries(
    Array.from(grouped.entries()).map(([signalKey, signalReports]) => [
      signalKey,
      computeCrowdSignal(signalKey, signalReports),
    ]),
  ) as Record<string, CrowdSignalSummary>;
}
