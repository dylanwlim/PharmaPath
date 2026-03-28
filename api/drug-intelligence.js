"use strict";

const {
  getQueryInput,
  searchDrugApplications,
  searchNdcRecords,
  searchRecallsForCandidate,
  searchShortagesForCandidate,
  sendJson,
} = require("./_lib/openfda");
const {
  buildCandidateContexts,
  buildDrugIntelligencePayload,
  buildSearchPhrases,
} = require("./_lib/openfda-normalize");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const input = getQueryInput(req);

    if (!input.query) {
      return sendJson(res, 400, {
        error: "A medication query is required.",
      });
    }

    const searchPhrases = buildSearchPhrases(input.query);

    const [ndcPayload, approvalsPayload] = await Promise.all([
      searchNdcRecords(searchPhrases),
      searchDrugApplications(searchPhrases),
    ]);

    const candidates = buildCandidateContexts(input.query, ndcPayload, approvalsPayload);
    const evidenceTargets = candidates.slice(0, 4);

    const evidencePairs = await Promise.all(
      evidenceTargets.map(async (candidate) => {
        const [shortagesResult, recallsResult] = await Promise.allSettled([
          searchShortagesForCandidate(candidate),
          searchRecallsForCandidate(candidate),
        ]);

        return {
          id: candidate.id,
          shortages:
            shortagesResult.status === "fulfilled"
              ? shortagesResult.value
              : { meta: { results: { total: 0, limit: 0, skip: 0 } }, results: [] },
          recalls:
            recallsResult.status === "fulfilled"
              ? recallsResult.value
              : { meta: { results: { total: 0, limit: 0, skip: 0 } }, results: [] },
        };
      }),
    );

    const shortageResultsById = Object.fromEntries(
      evidencePairs.map((entry) => [entry.id, entry.shortages]),
    );
    const recallResultsById = Object.fromEntries(
      evidencePairs.map((entry) => [entry.id, entry.recalls]),
    );

    return sendJson(
      res,
      200,
      buildDrugIntelligencePayload({
        query: input.query,
        ndcPayload,
        approvalsPayload,
        shortageResultsById,
        recallResultsById,
      }),
    );
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: error.message || "Unable to load medication intelligence right now.",
    });
  }
};
