"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const zlib = require("node:zlib");
const {
  deriveWorkflowCategory,
  normalizeIdentifier,
  normalizeMedicationText,
} = require("./normalize");

const SNAPSHOT_PATH = path.join(process.cwd(), "data", "medication-index.snapshot.json.gz");
const DEFAULT_SEARCH_LIMIT = 8;

let snapshotPromise = null;
let preparedIndexPromise = null;

async function loadSnapshotFromDisk() {
  const raw = await fs.readFile(SNAPSHOT_PATH);
  return JSON.parse(zlib.gunzipSync(raw).toString("utf8"));
}

async function getMedicationSnapshot() {
  if (!snapshotPromise) {
    snapshotPromise = loadSnapshotFromDisk().catch((error) => {
      snapshotPromise = null;
      throw error;
    });
  }

  return snapshotPromise;
}

function buildSearchText(record) {
  return normalizeMedicationText(
    [
      record.displayLabel,
      record.description,
      record.brandName,
      record.genericName,
      record.strength,
      record.dosageForm,
      record.route,
      ...(record.aliases || []),
      ...(record.activeIngredients || []).map((ingredient) =>
        [ingredient.name, ingredient.strength].filter(Boolean).join(" "),
      ),
      ...(record.ndcProductCodes || []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function prepareMedicationIndex(snapshot) {
  return {
    ...snapshot,
    records: snapshot.records.map((record) => ({
      ...record,
      normalizedLabel: normalizeMedicationText(record.displayLabel),
      normalizedAliases: (record.aliases || []).map(normalizeMedicationText),
      normalizedIdentifiers: [...(record.ndcProductCodes || []).map(normalizeIdentifier)].filter(Boolean),
      searchText: buildSearchText(record),
    })),
  };
}

async function getPreparedMedicationIndex() {
  if (!preparedIndexPromise) {
    preparedIndexPromise = getMedicationSnapshot()
      .then((snapshot) => prepareMedicationIndex(snapshot))
      .catch((error) => {
        preparedIndexPromise = null;
        throw error;
      });
  }

  return preparedIndexPromise;
}

function scoreAlias(alias, normalizedQuery) {
  if (!normalizedQuery) {
    return Number.POSITIVE_INFINITY;
  }

  if (alias === normalizedQuery) {
    return 0;
  }

  if (alias.startsWith(normalizedQuery)) {
    return 10 + alias.length / 1000;
  }

  if (alias.includes(` ${normalizedQuery}`)) {
    return 18;
  }

  if (alias.includes(normalizedQuery)) {
    return 26;
  }

  return Number.POSITIVE_INFINITY;
}

function scoreIdentifier(identifier, normalizedQuery, normalizedIdentifierQuery) {
  if (!normalizedIdentifierQuery) {
    return Number.POSITIVE_INFINITY;
  }

  if (identifier === normalizedIdentifierQuery) {
    return 2;
  }

  if (identifier.startsWith(normalizedIdentifierQuery)) {
    return 14;
  }

  if (normalizedQuery && identifier.includes(normalizedIdentifierQuery)) {
    return 22;
  }

  return Number.POSITIVE_INFINITY;
}

function scoreRecord(record, normalizedQuery, normalizedIdentifierQuery, queryTokens, exactOnly) {
  let bestScore = Number.POSITIVE_INFINITY;

  record.normalizedAliases.forEach((alias) => {
    bestScore = Math.min(bestScore, scoreAlias(alias, normalizedQuery));
  });

  record.normalizedIdentifiers.forEach((identifier) => {
    bestScore = Math.min(
      bestScore,
      scoreIdentifier(identifier, normalizedQuery, normalizedIdentifierQuery),
    );
  });

  if (exactOnly) {
    return bestScore;
  }

  if (bestScore !== Number.POSITIVE_INFINITY) {
    return bestScore;
  }

  if (queryTokens.length && queryTokens.every((token) => record.searchText.includes(token))) {
    return 40 + queryTokens.length;
  }

  return Number.POSITIVE_INFINITY;
}

function sortScoredResults(left, right) {
  return (
    left.score - right.score ||
    right.record.productCount - left.record.productCount ||
    left.record.displayLabel.localeCompare(right.record.displayLabel)
  );
}

function toMedicationSearchOption(record) {
  return {
    id: record.id,
    label: record.displayLabel,
    value: record.displayLabel,
    description: record.description,
    badge: record.badge || undefined,
  };
}

async function searchMedicationOptions(query, { limit = DEFAULT_SEARCH_LIMIT, exact = false } = {}) {
  const prepared = await getPreparedMedicationIndex();
  const normalizedQuery = normalizeMedicationText(query);
  const normalizedIdentifierQuery = normalizeIdentifier(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  if (!normalizedQuery) {
    const featuredResults = prepared.featuredMedicationIds
      .map((id) => prepared.records.find((record) => record.id === id))
      .filter(Boolean)
      .slice(0, limit)
      .map(toMedicationSearchOption);

    return {
      results: featuredResults,
      snapshot: prepared,
    };
  }

  const scored = prepared.records
    .map((record) => ({
      record,
      score: scoreRecord(record, normalizedQuery, normalizedIdentifierQuery, queryTokens, exact),
    }))
    .filter((entry) => entry.score !== Number.POSITIVE_INFINITY)
    .sort(sortScoredResults)
    .slice(0, limit)
    .map((entry) => toMedicationSearchOption(entry.record));

  return {
    results: scored,
    snapshot: prepared,
  };
}

async function resolveMedicationRecord(query) {
  const prepared = await getPreparedMedicationIndex();
  const normalizedQuery = normalizeMedicationText(query);
  const normalizedIdentifierQuery = normalizeIdentifier(query);

  if (!normalizedQuery) {
    return null;
  }

  return (
    prepared.records.find((record) => {
      return (
        record.normalizedAliases.includes(normalizedQuery) ||
        record.normalizedIdentifiers.includes(normalizedIdentifierQuery)
      );
    }) || null
  );
}

async function resolveMedicationProfile(query) {
  const exactRecord = await resolveMedicationRecord(query);
  if (exactRecord) {
    return {
      canonicalLabel: exactRecord.displayLabel,
      workflowCategory: exactRecord.workflowCategory,
    };
  }

  return {
    canonicalLabel: query.trim(),
    workflowCategory: deriveWorkflowCategory([query]),
  };
}

module.exports = {
  DEFAULT_SEARCH_LIMIT,
  SNAPSHOT_PATH,
  getMedicationSnapshot,
  resolveMedicationProfile,
  resolveMedicationRecord,
  searchMedicationOptions,
};
