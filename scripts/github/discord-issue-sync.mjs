import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_STATE_BRANCH = "discord-issue-sync-state";
const DEFAULT_STATE_PATH = ".github/discord-issue-sync/issues.json";
const STATE_VERSION = 1;
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

export function truncate(value, limit) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length <= limit) {
    return normalized;
  }

  if (limit <= 3) {
    return normalized.slice(0, limit);
  }

  return `${normalized.slice(0, limit - 3)}...`;
}

function cleanInlineText(value) {
  return truncate(String(value ?? "").replace(/`/g, "'").replace(/@/g, "@\u200b").trim(), 1000);
}

export function buildBodyPreview(body, limit = 320) {
  const normalized = String(body ?? "")
    .replace(/\r/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "No description provided.";
  }

  return truncate(cleanInlineText(normalized), limit);
}

function formatList(items, { emptyLabel = "none", wrap = false, limit = 1024 } = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return emptyLabel;
  }

  const rendered = items
    .filter(Boolean)
    .map((item) => cleanInlineText(item))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .map((item) => (wrap ? `\`${item}\`` : item))
    .join(", ");

  return truncate(rendered || emptyLabel, limit);
}

export function buildDiscordMessagePayload(issue, repositoryFullName) {
  const labels = Array.isArray(issue.labels)
    ? issue.labels
        .map((label) => {
          if (!label) {
            return "";
          }

          if (typeof label === "string") {
            return label;
          }

          return label.name || "";
        })
        .filter(Boolean)
    : [];
  const assignees = Array.isArray(issue.assignees)
    ? issue.assignees.map((assignee) => (assignee?.login ? `@${assignee.login}` : "")).filter(Boolean)
    : [];
  const bodyPreview = buildBodyPreview(issue.body);

  return {
    allowed_mentions: {
      parse: [],
    },
    embeds: [
      {
        title: truncate(`#${issue.number} ${cleanInlineText(issue.title || "Untitled issue")}`, 256),
        url: issue.html_url,
        color: DISCORD_OPEN_COLOR,
        description: truncate(bodyPreview, 4096),
        fields: [
          {
            name: "State",
            value: cleanInlineText((issue.state || "unknown").toUpperCase()),
            inline: true,
          },
          {
            name: "Labels",
            value: formatList(labels, { emptyLabel: "none", wrap: true }),
            inline: true,
          },
          {
            name: "Assignees",
            value: formatList(assignees, { emptyLabel: "none", wrap: true }),
            inline: true,
          },
          {
            name: "GitHub",
            value: `[Open issue](${issue.html_url})`,
            inline: true,
          },
        ],
        footer: {
          text: cleanInlineText(repositoryFullName),
        },
        timestamp: issue.updated_at || issue.created_at || new Date().toISOString(),
      },
    ],
  };
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
          messageId: value?.messageId ? String(value.messageId) : "",
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

function buildStateEntry(issue, messageId, syncedAt) {
  return {
    issueNumber: issue.number,
    issueUrl: issue.html_url || "",
    issueUpdatedAt: issue.updated_at || null,
    messageId: String(messageId),
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

async function discordRequest(webhookUrl, { allow404 = false, body, messageId = "", method = "POST", wait = false } = {}) {
  const response = await fetch(buildWebhookMessageUrl(webhookUrl, { messageId, wait }), {
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

  if (!response.ok) {
    throw new Error(
      `Discord webhook ${method} failed with ${response.status}${text ? `: ${summarizeErrorResponse(data, text)}` : ""}`,
    );
  }

  return data || {};
}

async function createDiscordMessage(webhookUrl, payload) {
  return discordRequest(webhookUrl, {
    method: "POST",
    body: payload,
    wait: true,
  });
}

async function updateDiscordMessage(webhookUrl, messageId, payload) {
  return discordRequest(webhookUrl, {
    method: "PATCH",
    messageId,
    body: payload,
    allow404: true,
  });
}

async function deleteDiscordMessage(webhookUrl, messageId) {
  return discordRequest(webhookUrl, {
    method: "DELETE",
    messageId,
    allow404: true,
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

async function upsertIssueMessage({ issue, logger, repositoryFullName, stateEntry, webhookUrl }) {
  const payload = buildDiscordMessagePayload(issue, repositoryFullName);
  const existingMessageId = stateEntry?.messageId ? String(stateEntry.messageId) : "";

  if (existingMessageId) {
    logger.info("Updating Discord issue message", {
      issueNumber: issue.number,
      messageId: existingMessageId,
    });

    const updatedMessage = await updateDiscordMessage(webhookUrl, existingMessageId, payload);

    if (updatedMessage) {
      return {
        messageId: String(updatedMessage.id || existingMessageId),
        operation: "updated",
      };
    }

    logger.warn("Mapped Discord message was missing; creating a replacement", {
      issueNumber: issue.number,
      messageId: existingMessageId,
    });
  }

  logger.info("Creating Discord issue message", {
    issueNumber: issue.number,
  });

  const createdMessage = await createDiscordMessage(webhookUrl, payload);

  if (!createdMessage?.id) {
    throw new Error(`Discord create response did not include a message id for issue #${issue.number}`);
  }

  return {
    messageId: String(createdMessage.id),
    operation: existingMessageId ? "recreated" : "created",
  };
}

async function removeIssueMessage({ issueNumber, logger, stateEntry, webhookUrl }) {
  const messageId = stateEntry?.messageId ? String(stateEntry.messageId) : "";

  if (!messageId) {
    logger.warn("No Discord mapping found for issue delete", {
      issueNumber,
    });
    return {
      operation: "missing-mapping",
    };
  }

  logger.info("Deleting Discord issue message", {
    issueNumber,
    messageId,
  });

  const deletedMessage = await deleteDiscordMessage(webhookUrl, messageId);

  if (deletedMessage === null) {
    logger.warn("Discord message already missing during delete", {
      issueNumber,
      messageId,
    });
    return {
      operation: "missing-message",
    };
  }

  return {
    operation: "deleted",
  };
}

async function runEventSync({ eventPayload, logger, repositoryFullName, state, webhookUrl }) {
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
    repositoryFullName,
    stateEntry: existingEntry,
    webhookUrl,
  });

  nextState.issues[issueKey] = buildStateEntry(issue, result.messageId, new Date().toISOString());

  return {
    dirty: true,
    state: nextState,
    summary: result.operation,
  };
}

async function runFullResync({ client, logger, repositoryFullName, state, webhookUrl }) {
  logger.info("Starting full Discord issue resync");

  const openIssues = await client.listOpenIssues();
  const nextState = normalizeState({ issues: {} });
  const seenIssueNumbers = new Set();

  for (const issue of openIssues) {
    seenIssueNumbers.add(issue.number);

    const result = await upsertIssueMessage({
      issue,
      logger,
      repositoryFullName,
      stateEntry: state.issues[String(issue.number)],
      webhookUrl,
    });

    nextState.issues[String(issue.number)] = buildStateEntry(issue, result.messageId, new Date().toISOString());
  }

  for (const [issueKey, stateEntry] of Object.entries(state.issues)) {
    const issueNumber = Number(issueKey);

    if (seenIssueNumbers.has(issueNumber)) {
      continue;
    }

    await removeIssueMessage({
      issueNumber,
      logger,
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

  await ensureStateBranch(client, stateBranch, repository.default_branch, logger);

  const { sha, state } = await loadState(client, stateBranch, statePath);
  const result =
    resolvedMode === "full-resync"
      ? await runFullResync({
          client,
          logger,
          repositoryFullName,
          state,
          webhookUrl,
        })
      : await runEventSync({
          eventPayload,
          logger,
          repositoryFullName,
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
