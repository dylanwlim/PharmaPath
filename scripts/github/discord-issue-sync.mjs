import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_STATE_BRANCH = "discord-issue-sync-state";
const DEFAULT_STATE_PATH = ".github/discord-issue-sync/issues.json";
const STATE_VERSION = 1;
const DISCORD_EMBED_DESCRIPTION_LIMIT = 4096;
const DISCORD_MAX_RETRY_ATTEMPTS = 6;
const DISCORD_RETRY_SAFETY_BUFFER_MS = 250;
const DISCORD_FULL_RESYNC_REQUEST_SPACING_MS = 450;
const ISSUE_ACTIONS_TO_UPSERT = new Set([
  "assigned",
  "edited",
  "labeled",
  "opened",
  "reopened",
  "unassigned",
  "unlabeled",
]);
const ISSUE_ACTIONS_TO_REMOVE = new Set(["closed", "deleted"]);
const DISCORD_OPEN_COLOR = 0x5865f2;

function createLogger(scope = "discord-issue-sync") {
  const emit = (method, message, details) => {
    const suffix = details ? ` ${safeJson(details)}` : "";
    console[method](`[${scope}] ${message}${suffix}`);
  };

  return {
    info(message, details) {
      emit("log", message, details);
    },
    warn(message, details) {
      emit("warn", message, details);
    },
    error(message, details) {
      emit("error", message, details);
    },
  };
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sanitizeDiscordText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/@/g, "@\u200b");
}

function normalizeInlineText(value, fallback = "none") {
  const normalized = sanitizeDiscordText(value).replace(/\n+/g, " ").trim();
  return normalized || fallback;
}

function normalizeIssueTitle(issue) {
  return normalizeInlineText(issue?.title, "Untitled issue");
}

export function normalizeIssueBody(body) {
  const normalized = sanitizeDiscordText(body);
  return normalized.trim() ? normalized : "No description provided.";
}

function formatList(items, { emptyLabel = "none" } = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return emptyLabel;
  }

  const rendered = items
    .filter(Boolean)
    .map((item) => normalizeInlineText(item, ""))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .join(", ");

  return rendered || emptyLabel;
}

function extractLabelNames(issue) {
  if (!Array.isArray(issue?.labels)) {
    return [];
  }

  return issue.labels
    .map((label) => {
      if (!label) {
        return "";
      }

      if (typeof label === "string") {
        return label;
      }

      return label.name || "";
    })
    .filter(Boolean);
}

function extractAssigneeNames(issue) {
  if (!Array.isArray(issue?.assignees)) {
    return [];
  }

  return issue.assignees.map((assignee) => (assignee?.login ? `@${assignee.login}` : "")).filter(Boolean);
}

function buildIssueHeading(issue, suffix = "") {
  return `#${issue.number} ${normalizeIssueTitle(issue)}${suffix ? ` (${suffix})` : ""}`;
}

export function buildIssueDetailsBlock(issue) {
  return [
    `State: ${normalizeInlineText(String(issue?.state || "unknown").toUpperCase())}`,
    `Labels: ${formatList(extractLabelNames(issue))}`,
    `Assignees: ${formatList(extractAssigneeNames(issue))}`,
    `GitHub: <${issue?.html_url || ""}>`,
  ].join("\n");
}

function createEmbedPayload(issue, description) {
  return {
    allowed_mentions: {
      parse: [],
    },
    embeds: [
      {
        color: DISCORD_OPEN_COLOR,
        description,
        timestamp: issue.updated_at || issue.created_at || new Date().toISOString(),
      },
    ],
  };
}

export function takeDiscordChunkPrefix(text, maxLength) {
  if (maxLength <= 0) {
    throw new Error(`Discord chunk length must be positive; received ${maxLength}.`);
  }

  if (text.length <= maxLength) {
    return text;
  }

  const candidate = text.slice(0, maxLength);
  const preferredBoundaryFloor = Math.floor(maxLength * 0.5);
  const boundaryCandidates = [
    { marker: "\n\n", width: 2 },
    { marker: "\n", width: 1 },
    { marker: " ", width: 1 },
  ];

  for (const boundary of boundaryCandidates) {
    const boundaryIndex = candidate.lastIndexOf(boundary.marker);

    if (boundaryIndex >= preferredBoundaryFloor) {
      return candidate.slice(0, boundaryIndex + boundary.width);
    }
  }

  for (const boundary of boundaryCandidates) {
    const boundaryIndex = candidate.lastIndexOf(boundary.marker);

    if (boundaryIndex > 0) {
      return candidate.slice(0, boundaryIndex + boundary.width);
    }
  }

  return candidate;
}

function splitBodyIntoDescriptions(issue, body) {
  const descriptions = [];
  let remainingBody = body;
  let chunkIndex = 1;

  while (remainingBody.length > 0) {
    const heading = buildIssueHeading(issue, chunkIndex === 1 ? "" : `continued ${chunkIndex}`);
    const prefix = `${heading}\n\n`;
    const maxChunkLength = DISCORD_EMBED_DESCRIPTION_LIMIT - prefix.length;
    const chunk = takeDiscordChunkPrefix(remainingBody, maxChunkLength);

    descriptions.push(`${prefix}${chunk}`);
    remainingBody = remainingBody.slice(chunk.length);
    chunkIndex += 1;
  }

  return descriptions;
}

function splitDetailsIntoDescriptions(issue, details) {
  const descriptions = [];
  let remainingDetails = details;
  let chunkIndex = 1;

  while (remainingDetails.length > 0) {
    const heading = buildIssueHeading(issue, chunkIndex === 1 ? "details" : `details ${chunkIndex}`);
    const prefix = `${heading}\n\n`;
    const maxChunkLength = DISCORD_EMBED_DESCRIPTION_LIMIT - prefix.length;
    const chunk = takeDiscordChunkPrefix(remainingDetails, maxChunkLength);

    descriptions.push(`${prefix}${chunk}`);
    remainingDetails = remainingDetails.slice(chunk.length);
    chunkIndex += 1;
  }

  return descriptions;
}

export function buildDiscordMessagePayloads(issue) {
  const body = normalizeIssueBody(issue?.body);
  const details = buildIssueDetailsBlock(issue);
  const descriptions = splitBodyIntoDescriptions(issue, body);
  const detailsSuffix = `\n\n${details}`;
  const lastBodyIndex = descriptions.length - 1;

  if (descriptions[lastBodyIndex].length + detailsSuffix.length <= DISCORD_EMBED_DESCRIPTION_LIMIT) {
    descriptions[lastBodyIndex] = `${descriptions[lastBodyIndex]}${detailsSuffix}`;
  } else {
    descriptions.push(...splitDetailsIntoDescriptions(issue, details));
  }

  return descriptions.map((description) => createEmbedPayload(issue, description));
}

export function normalizeMessageIds(value) {
  const rawMessageIds = Array.isArray(value?.messageIds)
    ? value.messageIds
    : value?.messageId
      ? [value.messageId]
      : [];

  return rawMessageIds.filter(Boolean).map((messageId) => String(messageId));
}

export function normalizeState(rawState = {}) {
  const rawIssues =
    rawState && typeof rawState === "object" && rawState.issues && typeof rawState.issues === "object" ? rawState.issues : {};

  const issues = Object.fromEntries(
    Object.entries(rawIssues)
      .filter(([issueNumber]) => Number.isFinite(Number(issueNumber)))
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([issueNumber, value]) => [
        String(Number(issueNumber)),
        {
          issueNumber: Number(issueNumber),
          issueUrl: value?.issueUrl || "",
          issueUpdatedAt: value?.issueUpdatedAt || null,
          messageIds: normalizeMessageIds(value),
          state: value?.state || "",
          syncedAt: value?.syncedAt || null,
          title: value?.title || "",
        },
      ]),
  );

  return {
    version: STATE_VERSION,
    updatedAt: rawState?.updatedAt || null,
    issues,
  };
}

function buildStateEntry(issue, messageIds, syncedAt) {
  return {
    issueNumber: issue.number,
    issueUrl: issue.html_url || "",
    issueUpdatedAt: issue.updated_at || null,
    messageIds: normalizeMessageIds({ messageIds }),
    state: issue.state || "",
    syncedAt,
    title: issue.title || "",
  };
}

function buildStateDocument(state, updatedAt) {
  const normalized = normalizeState(state);

  return {
    ...normalized,
    updatedAt,
  };
}

function buildApiUrl(apiBaseUrl, path) {
  return new URL(path.replace(/^\//, ""), `${apiBaseUrl.replace(/\/$/, "")}/`).toString();
}

function summarizeErrorResponse(data, fallback = "") {
  if (!data) {
    return fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data.message === "string" && data.message) {
    return data.message;
  }

  return fallback || safeJson(data);
}

function parseResponseBody(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseRetryAfterMilliseconds(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number.parseFloat(String(value));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  if (parsed > 100) {
    return Math.ceil(parsed);
  }

  return Math.ceil(parsed * 1000);
}

function parseHeaderDelayMilliseconds(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number.parseFloat(String(value));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.ceil(parsed * 1000);
}

export function getDiscordRetryDelayMs(headers, data, attempt) {
  const retryAfterHeaderDelay = parseHeaderDelayMilliseconds(headers?.get?.("retry-after"));
  const resetAfterHeaderDelay = parseHeaderDelayMilliseconds(headers?.get?.("x-ratelimit-reset-after"));
  const bodyDelay = parseRetryAfterMilliseconds(data?.retry_after);

  const derivedDelay = retryAfterHeaderDelay || resetAfterHeaderDelay || bodyDelay;

  if (derivedDelay > 0) {
    return Math.min(derivedDelay + DISCORD_RETRY_SAFETY_BUFFER_MS, 60000);
  }

  return Math.min(1000 * 2 ** attempt, 30000);
}

export function createDiscordRequestContext({ minimumSpacingMs = 0 } = {}) {
  return {
    minimumSpacingMs,
    nextAllowedAt: 0,
  };
}

export async function waitForDiscordRequestSlot({
  logger = createLogger(),
  messageId = "",
  method = "POST",
  requestContext,
  sleepImpl = sleep,
}) {
  const minimumSpacingMs = requestContext?.minimumSpacingMs || 0;

  if (minimumSpacingMs <= 0) {
    return;
  }

  const now = Date.now();
  const waitMs = Math.max(0, (requestContext.nextAllowedAt || 0) - now);

  if (waitMs > 0) {
    logger.info("Throttling Discord webhook request", {
      method,
      messageId,
      waitMs,
    });
    await sleepImpl(waitMs);
  }

  requestContext.nextAllowedAt = Date.now() + minimumSpacingMs;
}

function createGitHubClient({ apiBaseUrl, repositoryFullName, token }) {
  const [owner, repo] = String(repositoryFullName || "").split("/");

  if (!owner || !repo) {
    throw new Error(`Invalid repository name: ${repositoryFullName || "missing"}`);
  }

  const request = async (path, { allow404 = false, body, method = "GET" } = {}) => {
    const response = await fetch(buildApiUrl(apiBaseUrl, path), {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const data = parseResponseBody(text);

    if (allow404 && response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `GitHub API ${method} ${path} failed with ${response.status}${text ? `: ${summarizeErrorResponse(data, text)}` : ""}`,
      );
    }

    return data;
  };

  return {
    owner,
    repo,
    async createRef(ref, sha) {
      return request(`/repos/${owner}/${repo}/git/refs`, {
        method: "POST",
        body: {
          ref,
          sha,
        },
      });
    },
    async getFile(path, ref) {
      const encodedPath = path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

      return request(`/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`, {
        allow404: true,
      });
    },
    async getRef(branchName, { allow404 = false } = {}) {
      return request(`/repos/${owner}/${repo}/git/ref/${encodeURIComponent(`heads/${branchName}`)}`, {
        allow404,
      });
    },
    async getRepository() {
      return request(`/repos/${owner}/${repo}`);
    },
    async listOpenIssues() {
      const issues = [];

      for (let page = 1; page <= 100; page += 1) {
        const batch = await request(
          `/repos/${owner}/${repo}/issues?state=open&sort=created&direction=asc&per_page=100&page=${page}`,
        );

        if (!Array.isArray(batch) || batch.length === 0) {
          break;
        }

        issues.push(...batch.filter((item) => !item.pull_request));

        if (batch.length < 100) {
          break;
        }
      }

      return issues;
    },
    async putFile(path, { branch, content, message, sha }) {
      const encodedPath = path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

      return request(`/repos/${owner}/${repo}/contents/${encodedPath}`, {
        method: "PUT",
        body: {
          branch,
          content,
          message,
          sha,
        },
      });
    },
  };
}

export function buildWebhookMessageUrl(webhookUrl, { messageId = "", wait = false } = {}) {
  const url = new URL(webhookUrl);

  if (messageId) {
    url.pathname = `${url.pathname.replace(/\/$/, "")}/messages/${encodeURIComponent(messageId)}`;
  }

  if (wait) {
    url.searchParams.set("wait", "true");
  }

  return url.toString();
}

export async function discordRequest(
  webhookUrl,
  {
    allow404 = false,
    body,
    fetchImpl = fetch,
    logger = createLogger(),
    maxRetryAttempts = DISCORD_MAX_RETRY_ATTEMPTS,
    messageId = "",
    method = "POST",
    requestContext,
    sleepImpl = sleep,
    wait = false,
  } = {},
) {
  for (let attempt = 0; attempt <= maxRetryAttempts; attempt += 1) {
    await waitForDiscordRequestSlot({
      logger,
      messageId,
      method,
      requestContext,
      sleepImpl,
    });

    const response = await fetchImpl(buildWebhookMessageUrl(webhookUrl, { messageId, wait }), {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const data = parseResponseBody(text);

    if (allow404 && response.status === 404) {
      return null;
    }

    if (response.status === 429 && attempt < maxRetryAttempts) {
      const retryDelayMs = getDiscordRetryDelayMs(response.headers, data, attempt);

      logger.warn("Discord webhook rate limited; retrying request", {
        attempt: attempt + 1,
        maxRetryAttempts,
        method,
        messageId,
        retryDelayMs,
      });
      await sleepImpl(retryDelayMs);
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `Discord webhook ${method} failed with ${response.status}${text ? `: ${summarizeErrorResponse(data, text)}` : ""}`,
      );
    }

    if (attempt > 0) {
      logger.info("Discord webhook request succeeded after retry", {
        attempt: attempt + 1,
        method,
        messageId,
      });
    }

    return data || {};
  }

  throw new Error(`Discord webhook ${method} exhausted retry attempts unexpectedly.`);
}

async function createDiscordMessage(webhookUrl, payload, logger, requestContext) {
  return discordRequest(webhookUrl, {
    method: "POST",
    body: payload,
    logger,
    requestContext,
    wait: true,
  });
}

async function updateDiscordMessage(webhookUrl, messageId, payload, logger, requestContext) {
  return discordRequest(webhookUrl, {
    method: "PATCH",
    messageId,
    body: payload,
    allow404: true,
    logger,
    requestContext,
  });
}

async function deleteDiscordMessage(webhookUrl, messageId, logger, requestContext) {
  return discordRequest(webhookUrl, {
    method: "DELETE",
    messageId,
    allow404: true,
    logger,
    requestContext,
  });
}

async function ensureStateBranch(client, branchName, defaultBranch, logger) {
  const existingBranch = await client.getRef(branchName, { allow404: true });

  if (existingBranch) {
    return existingBranch;
  }

  const defaultBranchRef = await client.getRef(defaultBranch);

  try {
    logger.info("Creating Discord issue sync state branch", {
      branchName,
      defaultBranch,
    });
    return await client.createRef(`refs/heads/${branchName}`, defaultBranchRef.object.sha);
  } catch (error) {
    logger.warn("State branch create raced or failed; retrying ref lookup", {
      branchName,
      error: error.message,
    });

    const retriedBranch = await client.getRef(branchName, { allow404: true });

    if (retriedBranch) {
      return retriedBranch;
    }

    throw error;
  }
}

async function loadState(client, branchName, statePath) {
  const existingFile = await client.getFile(statePath, branchName);

  if (!existingFile) {
    return {
      sha: "",
      state: normalizeState(),
    };
  }

  const decoded = Buffer.from(String(existingFile.content || "").replace(/\n/g, ""), existingFile.encoding || "base64").toString(
    "utf8",
  );

  return {
    sha: existingFile.sha || "",
    state: normalizeState(JSON.parse(decoded)),
  };
}

async function saveState(client, branchName, statePath, state, existingSha, commitMessage) {
  const nextDocument = buildStateDocument(state, new Date().toISOString());
  const encodedContent = Buffer.from(`${JSON.stringify(nextDocument, null, 2)}\n`, "utf8").toString("base64");

  return client.putFile(statePath, {
    branch: branchName,
    content: encodedContent,
    message: commitMessage,
    sha: existingSha || undefined,
  });
}

export function resolveIssueMutation(action, issueState) {
  if (ISSUE_ACTIONS_TO_REMOVE.has(action)) {
    return "remove";
  }

  if (ISSUE_ACTIONS_TO_UPSERT.has(action)) {
    return issueState === "open" ? "upsert" : "remove";
  }

  return "noop";
}

function isPullRequestIssue(issue) {
  return Boolean(issue?.pull_request);
}

function summarizeSyncOperation({ createdCount, deletedCount, recreatedCount, updatedCount }) {
  if (recreatedCount > 0) {
    return "recreated";
  }

  if (createdCount > 0 && updatedCount === 0 && deletedCount === 0) {
    return "created";
  }

  if (createdCount === 0 && updatedCount > 0 && deletedCount === 0) {
    return "updated";
  }

  if (deletedCount > 0 && createdCount === 0 && updatedCount > 0) {
    return "trimmed";
  }

  if (createdCount > 0 || deletedCount > 0 || updatedCount > 0) {
    return "reconciled";
  }

  return "noop";
}

export async function syncDiscordIssueMessages({
  createMessage,
  deleteMessage,
  issue,
  logger = createLogger(),
  stateEntry,
  updateMessage,
}) {
  const payloads = buildDiscordMessagePayloads(issue);
  const existingMessageIds = normalizeMessageIds(stateEntry);
  const nextMessageIds = [];
  let createdCount = 0;
  let deletedCount = 0;
  let recreatedCount = 0;
  let updatedCount = 0;

  for (const [index, payload] of payloads.entries()) {
    const existingMessageId = existingMessageIds[index];

    if (existingMessageId) {
      logger.info("Updating Discord issue message chunk", {
        issueNumber: issue.number,
        messageId: existingMessageId,
        chunk: index + 1,
        chunks: payloads.length,
      });

      const updatedMessage = await updateMessage(existingMessageId, payload);

      if (updatedMessage) {
        nextMessageIds.push(String(updatedMessage.id || existingMessageId));
        updatedCount += 1;
        continue;
      }

      logger.warn("Mapped Discord issue message chunk was missing; creating a replacement", {
        issueNumber: issue.number,
        messageId: existingMessageId,
        chunk: index + 1,
        chunks: payloads.length,
      });
      recreatedCount += 1;
    } else {
      createdCount += 1;
    }

    logger.info("Creating Discord issue message chunk", {
      issueNumber: issue.number,
      chunk: index + 1,
      chunks: payloads.length,
    });

    const createdMessage = await createMessage(payload);

    if (!createdMessage?.id) {
      throw new Error(`Discord create response did not include a message id for issue #${issue.number}`);
    }

    nextMessageIds.push(String(createdMessage.id));
  }

  for (const [extraIndex, staleMessageId] of existingMessageIds.slice(payloads.length).entries()) {
    logger.info("Deleting stale Discord issue message chunk", {
      issueNumber: issue.number,
      messageId: staleMessageId,
      chunk: payloads.length + extraIndex + 1,
    });

    const deletedMessage = await deleteMessage(staleMessageId);

    if (deletedMessage === null) {
      logger.warn("Discord issue message chunk already missing during cleanup", {
        issueNumber: issue.number,
        messageId: staleMessageId,
      });
    }

    deletedCount += 1;
  }

  return {
    messageIds: nextMessageIds,
    operation: summarizeSyncOperation({
      createdCount,
      deletedCount,
      recreatedCount,
      updatedCount,
    }),
  };
}

export async function deleteDiscordIssueMessages({
  deleteMessage,
  issueNumber,
  logger = createLogger(),
  stateEntry,
}) {
  const messageIds = normalizeMessageIds(stateEntry);

  if (messageIds.length === 0) {
    logger.warn("No Discord mapping found for issue delete", {
      issueNumber,
    });
    return {
      operation: "missing-mapping",
    };
  }

  let deletedCount = 0;

  for (const [index, messageId] of messageIds.entries()) {
    logger.info("Deleting Discord issue message chunk", {
      issueNumber,
      messageId,
      chunk: index + 1,
      chunks: messageIds.length,
    });

    const deletedMessage = await deleteMessage(messageId);

    if (deletedMessage === null) {
      logger.warn("Discord issue message chunk already missing during delete", {
        issueNumber,
        messageId,
      });
      continue;
    }

    deletedCount += 1;
  }

  return {
    operation: deletedCount > 0 ? "deleted" : "missing-message",
  };
}

async function upsertIssueMessage({ issue, logger, requestContext, stateEntry, webhookUrl }) {
  return syncDiscordIssueMessages({
    issue,
    logger,
    stateEntry,
    createMessage: (payload) => createDiscordMessage(webhookUrl, payload, logger, requestContext),
    updateMessage: (messageId, payload) => updateDiscordMessage(webhookUrl, messageId, payload, logger, requestContext),
    deleteMessage: (messageId) => deleteDiscordMessage(webhookUrl, messageId, logger, requestContext),
  });
}

async function removeIssueMessage({ issueNumber, logger, requestContext, stateEntry, webhookUrl }) {
  return deleteDiscordIssueMessages({
    issueNumber,
    logger,
    stateEntry,
    deleteMessage: (messageId) => deleteDiscordMessage(webhookUrl, messageId, logger, requestContext),
  });
}

async function runEventSync({ eventPayload, logger, requestContext, state, webhookUrl }) {
  const action = String(eventPayload?.action || "");
  const issue = eventPayload?.issue;

  if (!issue) {
    throw new Error("Issue event payload did not include an issue object.");
  }

  if (isPullRequestIssue(issue)) {
    logger.info("Skipping pull request issue event", {
      action,
      issueNumber: issue.number,
    });
    return {
      dirty: false,
      state,
      summary: "skipped-pull-request",
    };
  }

  const mutation = resolveIssueMutation(action, issue.state);

  if (mutation === "noop") {
    logger.info("Ignoring unsupported issue event", {
      action,
      issueNumber: issue.number,
    });
    return {
      dirty: false,
      state,
      summary: "ignored",
    };
  }

  const issueKey = String(issue.number);
  const nextState = normalizeState(state);
  const existingEntry = nextState.issues[issueKey];

  if (mutation === "remove") {
    const result = await removeIssueMessage({
      issueNumber: issue.number,
      logger,
      requestContext,
      stateEntry: existingEntry,
      webhookUrl,
    });

    delete nextState.issues[issueKey];

    return {
      dirty: Boolean(existingEntry) || result.operation !== "missing-mapping",
      state: nextState,
      summary: result.operation,
    };
  }

  const result = await upsertIssueMessage({
    issue,
    logger,
    requestContext,
    stateEntry: existingEntry,
    webhookUrl,
  });

  nextState.issues[issueKey] = buildStateEntry(issue, result.messageIds, new Date().toISOString());

  return {
    dirty: true,
    state: nextState,
    summary: result.operation,
  };
}

async function runFullResync({ client, logger, requestContext, state, webhookUrl }) {
  logger.info("Starting full Discord issue resync");

  const openIssues = await client.listOpenIssues();
  const nextState = normalizeState({ issues: {} });
  const seenIssueNumbers = new Set();

  for (const issue of openIssues) {
    seenIssueNumbers.add(issue.number);

    const result = await upsertIssueMessage({
      issue,
      logger,
      requestContext,
      stateEntry: state.issues[String(issue.number)],
      webhookUrl,
    });

    nextState.issues[String(issue.number)] = buildStateEntry(issue, result.messageIds, new Date().toISOString());
  }

  for (const [issueKey, stateEntry] of Object.entries(state.issues)) {
    const issueNumber = Number(issueKey);

    if (seenIssueNumbers.has(issueNumber)) {
      continue;
    }

    await removeIssueMessage({
      issueNumber,
      logger,
      requestContext,
      stateEntry,
      webhookUrl,
    });
  }

  logger.info("Completed full Discord issue resync", {
    openIssues: openIssues.length,
  });

  return {
    dirty: true,
    state: nextState,
    summary: `resynced-${openIssues.length}`,
  };
}

async function readEventPayload(eventPath) {
  if (!eventPath) {
    throw new Error("GITHUB_EVENT_PATH is required for event-sync mode.");
  }

  const rawPayload = await readFile(eventPath, "utf8");
  return JSON.parse(rawPayload);
}

function resolveMode(explicitMode, eventName) {
  if (explicitMode) {
    return explicitMode;
  }

  if (eventName === "workflow_dispatch") {
    return "full-resync";
  }

  return "event-sync";
}

export async function runSync({ env = process.env, logger = createLogger(), mode } = {}) {
  const resolvedMode = resolveMode(mode, env.GITHUB_EVENT_NAME);
  const eventPayload = resolvedMode === "event-sync" ? await readEventPayload(env.GITHUB_EVENT_PATH) : null;
  const repositoryFullName = env.GITHUB_REPOSITORY || eventPayload?.repository?.full_name;
  const apiBaseUrl = env.GITHUB_API_URL || "https://api.github.com";
  const webhookUrl = env.DISCORD_ISSUES_WEBHOOK_URL;
  const token = env.DISCORD_ISSUE_SYNC_GITHUB_TOKEN || env.GITHUB_TOKEN;

  if (!repositoryFullName) {
    throw new Error("GITHUB_REPOSITORY is required.");
  }

  if (!webhookUrl) {
    throw new Error("DISCORD_ISSUES_WEBHOOK_URL is required.");
  }

  if (!token) {
    throw new Error("GITHUB_TOKEN or DISCORD_ISSUE_SYNC_GITHUB_TOKEN is required.");
  }

  const client = createGitHubClient({
    apiBaseUrl,
    repositoryFullName,
    token,
  });
  const repository = env.DEFAULT_BRANCH ? { default_branch: env.DEFAULT_BRANCH } : await client.getRepository();
  const stateBranch = env.DISCORD_ISSUE_SYNC_STATE_BRANCH || DEFAULT_STATE_BRANCH;
  const statePath = env.DISCORD_ISSUE_SYNC_STATE_PATH || DEFAULT_STATE_PATH;
  const requestContext = createDiscordRequestContext({
    minimumSpacingMs: resolvedMode === "full-resync" ? DISCORD_FULL_RESYNC_REQUEST_SPACING_MS : 0,
  });

  await ensureStateBranch(client, stateBranch, repository.default_branch, logger);

  const { sha, state } = await loadState(client, stateBranch, statePath);
  const result =
    resolvedMode === "full-resync"
      ? await runFullResync({
          client,
          logger,
          requestContext,
          state,
          webhookUrl,
        })
      : await runEventSync({
          eventPayload,
          logger,
          requestContext,
          state,
          webhookUrl,
        });

  if (result.dirty || !sha) {
    const commitMessage =
      resolvedMode === "full-resync"
        ? "chore: resync discord issue state"
        : `chore: sync discord issue state${eventPayload?.issue?.number ? ` for #${eventPayload.issue.number}` : ""}`;

    await saveState(client, stateBranch, statePath, result.state, sha, commitMessage);
    logger.info("Persisted Discord issue sync state", {
      branch: stateBranch,
      path: statePath,
      summary: result.summary,
    });
  } else {
    logger.info("No state changes to persist", {
      summary: result.summary,
    });
  }

  return {
    mode: resolvedMode,
    summary: result.summary,
  };
}

async function main() {
  await runSync({
    mode: process.argv[2],
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[discord-issue-sync] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}
