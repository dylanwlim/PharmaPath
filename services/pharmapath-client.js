const CACHE_PREFIX = "pharmapath:dossier:";
const CACHE_TTL_MS = 10 * 60 * 1000;

function sanitizeText(value = "") {
  return String(value).trim();
}

function getCacheKey(query) {
  return `${CACHE_PREFIX}${sanitizeText(query).toLowerCase()}`;
}

function readCache(query) {
  try {
    const cached = sessionStorage.getItem(getCacheKey(query));
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached);
    if (!parsed?.storedAt || !parsed?.payload) {
      return null;
    }

    if (Date.now() - parsed.storedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(getCacheKey(query));
      return null;
    }

    return parsed.payload;
  } catch (error) {
    return null;
  }
}

function writeCache(query, payload) {
  try {
    sessionStorage.setItem(
      getCacheKey(query),
      JSON.stringify({
        storedAt: Date.now(),
        payload,
      }),
    );
  } catch (error) {
    // Ignore storage failures and continue with the live payload.
  }
}

function getErrorMessage(payload, fallback) {
  if (payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }

  return fallback;
}

export function createPharmaPathClient({ fetchImpl = window.fetch.bind(window) } = {}) {
  return {
    readCachedDossier(query) {
      return readCache(query);
    },

    async getDrugIntelligence(query, { force = false } = {}) {
      const normalizedQuery = sanitizeText(query);

      if (!normalizedQuery) {
        throw new Error("A medication query is required.");
      }

      if (!force) {
        const cached = readCache(normalizedQuery);
        if (cached) {
          return cached;
        }
      }

      const response = await fetchImpl(
        `/api/drug-intelligence?query=${encodeURIComponent(normalizedQuery)}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Unable to load medication intelligence right now."),
        );
      }

      writeCache(normalizedQuery, payload);
      return payload;
    },

    async getHealth() {
      const response = await fetchImpl("/api/health", {
        headers: {
          Accept: "application/json",
        },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Unable to load health status."));
      }

      return payload;
    },
  };
}
