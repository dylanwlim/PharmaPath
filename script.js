import { featuredQueries } from "./data/sample-queries.js";
import { createPharmaPathClient } from "./services/pharmapath-client.js";

const client = createPharmaPathClient();
const page = document.body.dataset.page || "home";
const headerRoot = document.querySelector("[data-site-header]");
const footerRoot = document.querySelector("[data-site-footer]");
const revealNodes = Array.from(document.querySelectorAll("[data-reveal]"));

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeText(value = "") {
  return String(value).trim();
}

function titleCase(value = "") {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function formatDate(value) {
  if (!value) {
    return "Unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return "Unavailable";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function joinAnd(values = []) {
  if (values.length <= 1) {
    return values[0] || "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function getPageSection() {
  if (page.startsWith("patient") || page === "drug-detail") {
    return "patient";
  }

  if (page === "prescriber") {
    return "prescriber";
  }

  if (page === "methodology") {
    return "methodology";
  }

  return "home";
}

function getQueryParam() {
  return sanitizeText(new URLSearchParams(window.location.search).get("query"));
}

function getIdParam() {
  return sanitizeText(new URLSearchParams(window.location.search).get("id"));
}

function getFeaturedSampleLinks(mode = "patient") {
  return featuredQueries
    .map((item) => {
      const href =
        mode === "prescriber"
          ? `/prescriber/?query=${encodeURIComponent(item.query)}`
          : `/patient/results/?query=${encodeURIComponent(item.query)}`;

      return `
        <a class="sample-card surface-card" href="${href}">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.query)}</strong>
          <p>${escapeHtml(item.description)}</p>
        </a>
      `;
    })
    .join("");
}

function buildHeader() {
  const activeSection = getPageSection();

  headerRoot.innerHTML = `
    <div class="header-shell">
      <a class="brand" href="/" aria-label="PharmaPath home">
        <span class="brand-mark" aria-hidden="true"><span></span></span>
        <span class="brand-copy">
          <span class="brand-name">PharmaPath</span>
          <span class="brand-subtitle">FDA access signals</span>
        </span>
      </a>

      <button
        class="nav-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="site-nav"
      >
        <span class="sr-only">Toggle navigation</span>
        <span></span>
        <span></span>
      </button>

      <nav class="top-nav" id="site-nav" aria-label="Primary">
        <a class="${activeSection === "home" ? "is-active" : ""}" href="/">Home</a>
        <a class="${activeSection === "patient" ? "is-active" : ""}" href="/patient/">Patient</a>
        <a class="${activeSection === "prescriber" ? "is-active" : ""}" href="/prescriber/">Prescriber</a>
        <a class="${activeSection === "methodology" ? "is-active" : ""}" href="/methodology/">Methodology</a>
        <a class="button button-nav" href="/patient/">Start search</a>
      </nav>
    </div>
  `;
}

function buildFooter() {
  footerRoot.innerHTML = `
    <div class="footer-shell page-shell">
      <div>
        <p class="footer-brand">PharmaPath</p>
        <p class="footer-copy">
          Signal-based medication access guidance built on openFDA, with explicit
          boundaries around what the data cannot tell you.
        </p>
      </div>
      <div class="footer-links">
        <a href="/patient/">Patient search</a>
        <a href="/prescriber/">Prescriber view</a>
        <a href="/methodology/">Methodology</a>
      </div>
    </div>
  `;
}

function initGlobalChrome() {
  buildHeader();
  buildFooter();

  const header = document.querySelector("[data-site-header]");
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".top-nav");

  function setHeaderState() {
    header.classList.toggle("is-scrolled", window.scrollY > 16);
  }

  function toggleNav(forceState) {
    const shouldOpen =
      typeof forceState === "boolean"
        ? forceState
        : !header.classList.contains("is-open");

    header.classList.toggle("is-open", shouldOpen);
    document.body.classList.toggle("is-nav-open", shouldOpen);
    navToggle.setAttribute("aria-expanded", String(shouldOpen));
  }

  navToggle?.addEventListener("click", () => toggleNav());

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => toggleNav(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      toggleNav(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (header.classList.contains("is-open") && !event.target.closest(".header-shell")) {
      toggleNav(false);
    }
  });

  window.addEventListener("scroll", setHeaderState, { passive: true });
  setHeaderState();
}

function observeReveals() {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.18 },
  );

  revealNodes.forEach((node) => revealObserver.observe(node));
}

function setSearchInputs() {
  const query = getQueryParam();
  document.querySelectorAll('input[name="query"]').forEach((input) => {
    input.value = query;
  });
}

function populateSampleLinks() {
  document.querySelectorAll("[data-sample-links]").forEach((container) => {
    container.innerHTML = getFeaturedSampleLinks(container.dataset.sampleLinks);
  });
}

function renderSignalBadge(signal) {
  const levelClass =
    signal.level === "higher-friction"
      ? "signal-high"
      : signal.level === "mixed"
        ? "signal-mixed"
        : "signal-steady";

  return `
    <span class="signal-badge ${levelClass}">
      <span>${escapeHtml(signal.label)}</span>
      <small>${escapeHtml(signal.confidence_label)}</small>
    </span>
  `;
}

function renderMetric(label, value) {
  return `
    <div class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderList(items = []) {
  return `
    <ul class="list-clean">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderTagList(items = []) {
  if (!items.length) {
    return `<p class="muted-copy">Unavailable</p>`;
  }

  return `
    <div class="tag-list">
      ${items.map((item) => `<span class="tag-pill">${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function renderLoadingState(mode = "patient") {
  return `
    <div class="skeleton-stack">
      <div class="surface-card skeleton-card skeleton-hero"></div>
      <div class="skeleton-grid">
        <div class="surface-card skeleton-card"></div>
        <div class="surface-card skeleton-card"></div>
      </div>
      ${
        mode === "prescriber"
          ? `<div class="surface-card skeleton-card skeleton-tall"></div>`
          : `<div class="surface-card skeleton-card skeleton-tall"></div>`
      }
    </div>
  `;
}

function renderIdleState(mode = "patient") {
  const heading =
    mode === "prescriber"
      ? "Search for a medication to load prescriber intelligence."
      : "Search for a medication to load patient-friendly access results.";
  const body =
    mode === "prescriber"
      ? "The prescriber route will focus on shortage, manufacturer, recall, and formulation context."
      : "The patient route will answer likely access friction first, then suggest what to ask next.";
  const sampleMode = mode === "prescriber" ? "prescriber" : "patient";

  return `
    <div class="surface-card empty-card">
      <p class="eyebrow eyebrow-dark">Ready when you are</p>
      <h2>${escapeHtml(heading)}</h2>
      <p>${escapeHtml(body)}</p>
      <div class="sample-grid">${getFeaturedSampleLinks(sampleMode)}</div>
    </div>
  `;
}

function renderErrorState(message, retryHref) {
  return `
    <div class="surface-card empty-card empty-card-error">
      <p class="eyebrow eyebrow-dark">Unable to load the search</p>
      <h2>${escapeHtml(message)}</h2>
      <p>
        PharmaPath is not substituting fake availability when the FDA fetch fails.
        Retry the search or review the methodology page for the current data-source boundary.
      </p>
      <div class="action-row">
        <a class="button button-secondary" href="${retryHref}">Try again</a>
        <a class="button button-ghost" href="/methodology/">Review methodology</a>
      </div>
    </div>
  `;
}

function renderEmptyMatchState(query) {
  return `
    <div class="surface-card empty-card">
      <p class="eyebrow eyebrow-dark">No clear FDA match</p>
      <h2>No FDA-listed medication family surfaced for “${escapeHtml(query)}”.</h2>
      <p>
        Try a cleaner brand or generic name, or remove extra wording so the search can match FDA records more directly.
      </p>
      <div class="sample-grid">${getFeaturedSampleLinks("patient")}</div>
    </div>
  `;
}

function renderCandidateCard(query, match, hrefBase = "/drug/") {
  return `
    <a
      class="candidate-card surface-card"
      href="${hrefBase}?query=${encodeURIComponent(query)}&id=${encodeURIComponent(match.id)}"
    >
      <div class="candidate-head">
        <div>
          <span class="candidate-label">${escapeHtml(match.display_name)}</span>
          <h3>${escapeHtml(match.canonical_label)}</h3>
        </div>
        ${renderSignalBadge(match.access_signal)}
      </div>
      <p class="candidate-copy">${escapeHtml(match.access_signal.patient_summary)}</p>
      <div class="candidate-meta">
        ${renderMetric("FDA listings", String(match.active_listing_count))}
        ${renderMetric("Manufacturers", String(match.manufacturers.length))}
      </div>
    </a>
  `;
}

function buildFreshnessLine(payload) {
  const entries = [
    payload.data_freshness.ndc_last_updated
      ? `Listings: ${formatDate(payload.data_freshness.ndc_last_updated)}`
      : "",
    payload.data_freshness.shortages_last_updated
      ? `Shortages: ${formatDate(payload.data_freshness.shortages_last_updated)}`
      : "",
    payload.data_freshness.recalls_last_updated
      ? `Recalls: ${formatDate(payload.data_freshness.recalls_last_updated)}`
      : "",
  ].filter(Boolean);

  if (!entries.length) {
    return "FDA dataset freshness was unavailable for this request.";
  }

  return `FDA datasets used in this view: ${entries.join(" · ")}.`;
}

function renderPatientResults(payload) {
  const match = payload.matches[0];

  if (!match) {
    return renderEmptyMatchState(payload.query.raw);
  }

  document.title = `${match.display_name} | Patient Results | PharmaPath`;

  return `
    <div class="results-stack">
      <section class="surface-card summary-card">
        <div class="summary-head">
          <div>
            <p class="eyebrow eyebrow-dark">Top patient match</p>
            <h2>${escapeHtml(match.display_name)}</h2>
            <p class="summary-subtitle">${escapeHtml(match.canonical_label)}</p>
          </div>
          ${renderSignalBadge(match.access_signal)}
        </div>

        <p class="lead-copy">${escapeHtml(match.patient_view.summary)}</p>

        <div class="metric-grid">
          ${renderMetric("FDA listings", String(match.active_listing_count))}
          ${renderMetric("Manufacturers", String(match.manufacturers.length))}
          ${renderMetric("Shortage entries", String(match.evidence.shortages.active_count))}
          ${renderMetric("Recent recalls", String(match.evidence.recalls.recent_count))}
        </div>

        <p class="subtle-note">${escapeHtml(buildFreshnessLine(payload))}</p>
      </section>

      <div class="content-grid">
        <section class="surface-card">
          <p class="eyebrow eyebrow-dark">What we know</p>
          <h3>Directly from FDA data</h3>
          ${renderList(match.patient_view.what_we_know)}
        </section>

        <section class="surface-card">
          <p class="eyebrow eyebrow-dark">What may make it harder</p>
          <h3>Signal-based friction clues</h3>
          ${renderList(match.patient_view.what_may_make_it_harder)}
        </section>
      </div>

      <section class="surface-card">
        <p class="eyebrow eyebrow-dark">What to ask next</p>
        <h3>Use the next question instead of guessing.</h3>
        ${renderList(match.patient_view.questions_to_ask)}
        <div class="action-row">
          <a
            class="button button-primary"
            href="/drug/?query=${encodeURIComponent(payload.query.raw)}&id=${encodeURIComponent(match.id)}"
          >
            Open drug detail
          </a>
          <a
            class="button button-secondary"
            href="/prescriber/?query=${encodeURIComponent(payload.query.raw)}&id=${encodeURIComponent(match.id)}"
          >
            View prescriber intelligence
          </a>
        </div>
      </section>

      <section class="surface-card">
        <p class="eyebrow eyebrow-dark">Important limitation</p>
        <h3>What PharmaPath still cannot tell you</h3>
        ${renderList(match.patient_view.unavailable)}
      </section>

      ${
        payload.matches.length > 1
          ? `
            <section class="surface-card">
              <p class="eyebrow eyebrow-dark">Other matching families</p>
              <h3>Keep the alternatives organized.</h3>
              <div class="candidate-grid">
                ${payload.matches
                  .slice(1)
                  .map((candidate) => renderCandidateCard(payload.query.raw, candidate))
                  .join("")}
              </div>
            </section>
          `
          : ""
      }
    </div>
  `;
}

function renderEvidenceAccordion(title, body, open = false) {
  return `
    <details class="accordion" ${open ? "open" : ""}>
      <summary>${escapeHtml(title)}</summary>
      <div class="accordion-body">${body}</div>
    </details>
  `;
}

function renderDrugDetail(payload, match) {
  document.title = `${match.display_name} | Drug Detail | PharmaPath`;

  const shortageBody = match.evidence.shortages.items.length
    ? match.evidence.shortages.items
        .map(
          (item) => `
            <article class="evidence-row">
              <div>
                <strong>${escapeHtml(item.presentation || item.status)}</strong>
                <p>${escapeHtml(item.shortageReason || item.availability || "No additional FDA detail provided.")}</p>
              </div>
              <span>${escapeHtml(item.updateLabel)}</span>
            </article>
          `,
        )
        .join("")
    : `<p class="muted-copy">No matching shortage record surfaced for this product family.</p>`;

  const recallBody = match.evidence.recalls.items.length
    ? match.evidence.recalls.items
        .map(
          (item) => `
            <article class="evidence-row">
              <div>
                <strong>${escapeHtml(item.classification || item.status)}</strong>
                <p>${escapeHtml(item.reason || item.productDescription || "No additional recall reason provided.")}</p>
              </div>
              <span>${escapeHtml(item.reportDateLabel)}</span>
            </article>
          `,
        )
        .join("")
    : `<p class="muted-copy">No matching recall record surfaced in the recent FDA enforcement data.</p>`;

  const approvalBody = `
    <div class="detail-block">
      <p><strong>Sponsor:</strong> ${escapeHtml(match.evidence.approvals.sponsor_name || "Unavailable")}</p>
      <p><strong>Latest submission:</strong> ${escapeHtml(match.evidence.approvals.latest_submission_label || "Unavailable")}</p>
    </div>
    <div class="detail-block">
      <p class="detail-heading">Recent manufacturing-related updates</p>
      ${
        match.evidence.approvals.recent_manufacturing_updates.length
          ? renderList(
              match.evidence.approvals.recent_manufacturing_updates.map(
                (item) => `${item.type} · ${item.date_label} · ${item.status}`,
              ),
            )
          : `<p class="muted-copy">No recent manufacturing update surfaced in the returned approval metadata.</p>`
      }
    </div>
    <div class="detail-block">
      <p class="detail-heading">Recent labeling updates</p>
      ${
        match.evidence.approvals.recent_labeling_updates.length
          ? renderList(
              match.evidence.approvals.recent_labeling_updates.map(
                (item) => `${item.type} · ${item.date_label} · ${item.status}`,
              ),
            )
          : `<p class="muted-copy">No recent labeling update surfaced in the returned approval metadata.</p>`
      }
    </div>
  `;

  return `
    <div class="results-stack">
      <a class="text-link muted-link" href="/patient/results/?query=${encodeURIComponent(payload.query.raw)}">Back to patient results</a>

      <section class="surface-card summary-card">
        <div class="summary-head">
          <div>
            <p class="eyebrow eyebrow-dark">Selected drug family</p>
            <h2>${escapeHtml(match.display_name)}</h2>
            <p class="summary-subtitle">${escapeHtml(match.canonical_label)}</p>
          </div>
          ${renderSignalBadge(match.access_signal)}
        </div>

        <p class="lead-copy">${escapeHtml(match.access_signal.prescriber_summary)}</p>

        <div class="metric-grid">
          ${renderMetric("FDA listings", String(match.active_listing_count))}
          ${renderMetric("Manufacturers", String(match.manufacturers.length))}
          ${renderMetric("Strengths", String(match.strengths.length))}
          ${renderMetric("Recent recalls", String(match.evidence.recalls.recent_count))}
        </div>
      </section>

      <div class="content-grid">
        <section class="surface-card">
          <p class="eyebrow eyebrow-dark">Listed strengths</p>
          <h3>Formulations and manufacturers</h3>
          ${renderTagList(match.strengths)}
          <div class="detail-block">
            <p class="detail-heading">Manufacturers</p>
            ${renderTagList(match.manufacturers)}
          </div>
          <div class="detail-block">
            <p class="detail-heading">Application numbers</p>
            ${renderTagList(match.application_numbers)}
          </div>
        </section>

        <section class="surface-card">
          <p class="eyebrow eyebrow-dark">Inference boundary</p>
          <h3>Known, inferred, and unavailable</h3>
          ${renderList(match.access_signal.reasoning)}
          <p class="subtle-note">
            This interpretation is signal-based. It is not confirmation of store-level availability.
          </p>
        </section>
      </div>

      <div class="accordion-stack">
        ${renderEvidenceAccordion("Shortage entries", shortageBody, true)}
        ${renderEvidenceAccordion("Recall context", recallBody)}
        ${renderEvidenceAccordion("Approval and manufacturing context", approvalBody)}
      </div>

      <section class="surface-card">
        <p class="eyebrow eyebrow-dark">Go deeper or translate back</p>
        <div class="action-row">
          <a
            class="button button-secondary"
            href="/prescriber/?query=${encodeURIComponent(payload.query.raw)}&id=${encodeURIComponent(match.id)}"
          >
            Prescriber intelligence
          </a>
          <a
            class="button button-ghost"
            href="/methodology/"
          >
            Review methodology
          </a>
        </div>
      </section>
    </div>
  `;
}

function renderPrescriberResults(payload, match) {
  document.title = `${match.display_name} | Prescriber Intelligence | PharmaPath`;

  return `
    <div class="results-stack">
      <section class="surface-card summary-card">
        <div class="summary-head">
          <div>
            <p class="eyebrow eyebrow-dark">Prescriber summary</p>
            <h2>${escapeHtml(match.display_name)}</h2>
            <p class="summary-subtitle">${escapeHtml(match.canonical_label)}</p>
          </div>
          ${renderSignalBadge(match.access_signal)}
        </div>

        <p class="lead-copy">${escapeHtml(match.prescriber_view.summary)}</p>

        <div class="metric-grid">
          ${renderMetric("Active listings", String(match.active_listing_count))}
          ${renderMetric("Manufacturers", String(match.manufacturers.length))}
          ${renderMetric("Shortage records", String(match.evidence.shortages.active_count))}
          ${renderMetric("Recent recalls", String(match.evidence.recalls.recent_count))}
        </div>
      </section>

      <div class="content-grid">
        <section class="surface-card">
          <p class="eyebrow eyebrow-dark">Prescriber takeaways</p>
          <h3>Operational summary</h3>
          ${renderList(match.prescriber_view.takeaways)}
        </section>

        <section class="surface-card">
          <p class="eyebrow eyebrow-dark">Formulation spread</p>
          <h3>What the FDA match set looks like</h3>
          <div class="detail-block">
            <p class="detail-heading">Strengths</p>
            ${renderTagList(match.strengths)}
          </div>
          <div class="detail-block">
            <p class="detail-heading">Routes and dosage forms</p>
            ${renderTagList([...match.routes, ...match.dosage_forms])}
          </div>
          <div class="detail-block">
            <p class="detail-heading">Manufacturers</p>
            ${renderTagList(match.manufacturers)}
          </div>
        </section>
      </div>

      <section class="surface-card">
        <p class="eyebrow eyebrow-dark">Alternative planning</p>
        <h3>${match.prescriber_view.should_consider_alternatives ? "Worth considering earlier" : "No strong trigger from FDA data alone"}</h3>
        <p>
          ${
            match.prescriber_view.should_consider_alternatives
              ? "Because the returned FDA signals are not cleanly steady, it is reasonable to think about backup formulations, strengths, or therapeutic alternatives sooner."
              : "The returned FDA data does not show a strong reason to abandon the original plan immediately, though local fill success may still vary."
          }
        </p>
      </section>

      ${
        payload.matches.length > 1
          ? `
            <section class="surface-card">
              <p class="eyebrow eyebrow-dark">Other matching product families</p>
              <div class="candidate-grid">
                ${payload.matches
                  .filter((candidate) => candidate.id !== match.id)
                  .map((candidate) => renderCandidateCard(payload.query.raw, candidate, "/prescriber/"))
                  .join("")}
              </div>
            </section>
          `
          : ""
      }

      <section class="surface-card">
        <p class="eyebrow eyebrow-dark">Evidence trail</p>
        <div class="accordion-stack">
          ${renderEvidenceAccordion(
            "Shortage and discontinuation entries",
            match.evidence.shortages.items.length
              ? match.evidence.shortages.items
                  .map(
                    (item) => `
                      <article class="evidence-row">
                        <div>
                          <strong>${escapeHtml(item.status)}</strong>
                          <p>${escapeHtml(item.presentation || item.shortageReason || "No presentation detail available.")}</p>
                        </div>
                        <span>${escapeHtml(item.updateLabel)}</span>
                      </article>
                    `,
                  )
                  .join("")
              : `<p class="muted-copy">No matching shortage entry surfaced for this product family.</p>`,
            true,
          )}
          ${renderEvidenceAccordion(
            "Recall notices",
            match.evidence.recalls.items.length
              ? match.evidence.recalls.items
                  .map(
                    (item) => `
                      <article class="evidence-row">
                        <div>
                          <strong>${escapeHtml(item.classification || item.status)}</strong>
                          <p>${escapeHtml(item.reason || item.productDescription || "No recall reason provided.")}</p>
                        </div>
                        <span>${escapeHtml(item.reportDateLabel)}</span>
                      </article>
                    `,
                  )
                  .join("")
              : `<p class="muted-copy">No matching recall notice surfaced in the recent FDA enforcement data.</p>`,
          )}
        </div>
      </section>
    </div>
  `;
}

function findSelectedMatch(payload) {
  const id = getIdParam();
  if (!id) {
    return payload.matches[0] || null;
  }

  return payload.matches.find((match) => match.id === id) || payload.matches[0] || null;
}

async function initPatientResultsPage() {
  const root = document.querySelector("#patient-results-root");
  const query = getQueryParam();

  if (!root) {
    return;
  }

  if (!query) {
    root.innerHTML = renderIdleState("patient");
    return;
  }

  root.innerHTML = renderLoadingState("patient");

  try {
    const payload = await client.getDrugIntelligence(query);
    root.innerHTML = renderPatientResults(payload);
  } catch (error) {
    root.innerHTML = renderErrorState(
      error.message,
      `/patient/results/?query=${encodeURIComponent(query)}`,
    );
  }
}

async function initDrugDetailPage() {
  const root = document.querySelector("#drug-detail-root");
  const query = getQueryParam();

  if (!root) {
    return;
  }

  if (!query) {
    root.innerHTML = renderIdleState("patient");
    return;
  }

  root.innerHTML = renderLoadingState("detail");

  try {
    const payload = await client.getDrugIntelligence(query);
    const match = findSelectedMatch(payload);

    if (!match) {
      root.innerHTML = renderEmptyMatchState(query);
      return;
    }

    root.innerHTML = renderDrugDetail(payload, match);
  } catch (error) {
    root.innerHTML = renderErrorState(
      error.message,
      `/drug/?query=${encodeURIComponent(query)}&id=${encodeURIComponent(getIdParam())}`,
    );
  }
}

async function initPrescriberPage() {
  const root = document.querySelector("#prescriber-root");
  const query = getQueryParam();

  if (!root) {
    return;
  }

  if (!query) {
    root.innerHTML = renderIdleState("prescriber");
    return;
  }

  root.innerHTML = renderLoadingState("prescriber");

  try {
    const payload = await client.getDrugIntelligence(query);
    const match = findSelectedMatch(payload);

    if (!match) {
      root.innerHTML = renderEmptyMatchState(query);
      return;
    }

    root.innerHTML = renderPrescriberResults(payload, match);
  } catch (error) {
    root.innerHTML = renderErrorState(
      error.message,
      `/prescriber/?query=${encodeURIComponent(query)}&id=${encodeURIComponent(getIdParam())}`,
    );
  }
}

async function initMethodologyPage() {
  const root = document.querySelector("#health-status-root");

  if (!root) {
    return;
  }

  try {
    const payload = await client.getHealth();
    root.innerHTML = `
      <p class="eyebrow eyebrow-dark">Live status</p>
      <h2>Data source: ${escapeHtml(payload.data_source || "openFDA")}</h2>
      <p>
        Health route is responding. Optional API key configured:
        <strong>${payload.openfda_api_key_configured ? "yes" : "no"}</strong>.
      </p>
    `;
  } catch (error) {
    root.innerHTML = `
      <p class="eyebrow eyebrow-dark">Live status</p>
      <h2>Unable to load the health route</h2>
      <p>${escapeHtml(error.message)}</p>
    `;
  }
}

function initPage() {
  populateSampleLinks();
  setSearchInputs();

  if (page === "patient-results") {
    initPatientResultsPage();
    return;
  }

  if (page === "drug-detail") {
    initDrugDetailPage();
    return;
  }

  if (page === "prescriber") {
    initPrescriberPage();
    return;
  }

  if (page === "methodology") {
    initMethodologyPage();
  }
}

initGlobalChrome();
observeReveals();
initPage();

window.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-ready");
});
