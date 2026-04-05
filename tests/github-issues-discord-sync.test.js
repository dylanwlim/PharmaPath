"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const syncModulePromise = import("../scripts/github/discord-issue-sync.mjs");

function createIssue(overrides = {}) {
  return {
    number: 42,
    title: "Issue title",
    state: "open",
    labels: [{ name: "bug" }, { name: "urgent" }],
    assignees: [{ login: "zoe" }, { login: "alex" }],
    body: "First line.\n\nSecond line.",
    html_url: "https://github.com/example/repo/issues/42",
    updated_at: "2026-04-05T12:00:00.000Z",
    created_at: "2026-04-05T11:00:00.000Z",
    ...overrides,
  };
}

function createLongBody(targetLength = 12000) {
  const paragraph = [
    "Summary",
    "",
    "- first bullet with context",
    "- second bullet with more detail",
    "",
    "Implementation notes live here with multiline paragraphs that should remain readable after chunking.",
    "",
  ].join("\n");

  return paragraph.repeat(Math.ceil(targetLength / paragraph.length)).slice(0, targetLength);
}

test("short issue body renders in one payload without truncation", async () => {
  const { buildDiscordMessagePayloads } = await syncModulePromise;

  const payloads = buildDiscordMessagePayloads(createIssue());

  assert.equal(payloads.length, 1);
  assert.equal(
    payloads[0].embeds[0].description,
    [
      "#42 Issue title",
      "",
      "First line.",
      "",
      "Second line.",
      "",
      "State: OPEN",
      "Labels: bug, urgent",
      "Assignees: @\u200balex, @\u200bzoe",
      "GitHub: <https://github.com/example/repo/issues/42>",
    ].join("\n"),
  );
});

test("long multiline issue body preserves paragraphs and bullets", async () => {
  const { buildDiscordMessagePayloads } = await syncModulePromise;

  const body = [
    "Intro paragraph.",
    "",
    "- bullet one",
    "- bullet two",
    "",
    "Closing paragraph stays separate.",
  ].join("\n");
  const payloads = buildDiscordMessagePayloads(createIssue({ body }));

  assert.equal(payloads.length, 1);
  assert.match(payloads[0].embeds[0].description, /Intro paragraph\.\n\n- bullet one\n- bullet two\n\nClosing paragraph stays separate\./);
});

test("overflow handling splits long issue bodies into readable continuation payloads", async () => {
  const { buildDiscordMessagePayloads } = await syncModulePromise;

  const payloads = buildDiscordMessagePayloads(createIssue({ body: createLongBody() }));

  assert.ok(payloads.length > 1);
  assert.ok(payloads.every((payload) => payload.embeds[0].description.length <= 4096));
  assert.match(payloads[0].embeds[0].description, /^#42 Issue title\n\n/);
  assert.match(payloads[1].embeds[0].description, /^#42 Issue title \(continued 2\)\n\n/);
  assert.match(payloads[payloads.length - 1].embeds[0].description, /State: OPEN/);
});

test("sync reconciles an edit from short to long by updating the first message and creating continuations", async () => {
  const { syncDiscordIssueMessages } = await syncModulePromise;
  const updateCalls = [];
  const createCalls = [];
  const deleteCalls = [];

  const result = await syncDiscordIssueMessages({
    issue: createIssue({ body: createLongBody() }),
    stateEntry: {
      messageIds: ["msg-1"],
    },
    updateMessage: async (messageId, payload) => {
      updateCalls.push({ messageId, payload });
      return { id: messageId };
    },
    createMessage: async (payload) => {
      const id = `created-${createCalls.length + 1}`;
      createCalls.push({ id, payload });
      return { id };
    },
    deleteMessage: async (messageId) => {
      deleteCalls.push(messageId);
      return {};
    },
  });

  assert.equal(updateCalls.length, 1);
  assert.ok(createCalls.length >= 1);
  assert.deepEqual(deleteCalls, []);
  assert.equal(result.messageIds[0], "msg-1");
  assert.equal(result.messageIds.length, updateCalls.length + createCalls.length);
});

test("sync reconciles an edit from long to short by updating the first message and deleting surplus continuations", async () => {
  const { syncDiscordIssueMessages } = await syncModulePromise;
  const updateCalls = [];
  const createCalls = [];
  const deleteCalls = [];

  const result = await syncDiscordIssueMessages({
    issue: createIssue(),
    stateEntry: {
      messageIds: ["msg-1", "msg-2", "msg-3"],
    },
    updateMessage: async (messageId, payload) => {
      updateCalls.push({ messageId, payload });
      return { id: messageId };
    },
    createMessage: async (payload) => {
      createCalls.push(payload);
      return { id: "unexpected-create" };
    },
    deleteMessage: async (messageId) => {
      deleteCalls.push(messageId);
      return {};
    },
  });

  assert.equal(updateCalls.length, 1);
  assert.equal(createCalls.length, 0);
  assert.deepEqual(deleteCalls, ["msg-2", "msg-3"]);
  assert.deepEqual(result.messageIds, ["msg-1"]);
});

test("close or delete cleanup removes all associated Discord messages", async () => {
  const { deleteDiscordIssueMessages } = await syncModulePromise;
  const deleteCalls = [];

  const result = await deleteDiscordIssueMessages({
    issueNumber: 42,
    stateEntry: {
      messageIds: ["msg-1", "msg-2", "msg-3"],
    },
    deleteMessage: async (messageId) => {
      deleteCalls.push(messageId);
      return {};
    },
  });

  assert.equal(result.operation, "deleted");
  assert.deepEqual(deleteCalls, ["msg-1", "msg-2", "msg-3"]);
});

test("state normalization upgrades a legacy single message id into a message id array", async () => {
  const { normalizeState } = await syncModulePromise;

  const state = normalizeState({
    issues: {
      10: {
        issueNumber: 10,
        messageId: 999,
      },
      2: {
        issueNumber: 2,
        messageIds: ["123", "456"],
        title: "Earlier issue",
      },
    },
  });

  assert.deepEqual(Object.keys(state.issues), ["2", "10"]);
  assert.deepEqual(state.issues["10"].messageIds, ["999"]);
  assert.deepEqual(state.issues["2"].messageIds, ["123", "456"]);
  assert.equal(state.issues["2"].title, "Earlier issue");
});

test("issue mutation resolution keeps open issues upserted and closed issues removed", async () => {
  const { resolveIssueMutation } = await syncModulePromise;

  assert.equal(resolveIssueMutation("opened", "open"), "upsert");
  assert.equal(resolveIssueMutation("edited", "open"), "upsert");
  assert.equal(resolveIssueMutation("labeled", "open"), "upsert");
  assert.equal(resolveIssueMutation("edited", "closed"), "remove");
  assert.equal(resolveIssueMutation("closed", "closed"), "remove");
  assert.equal(resolveIssueMutation("deleted", "open"), "remove");
  assert.equal(resolveIssueMutation("milestoned", "open"), "noop");
});

test("webhook message url builder supports create and edit endpoints", async () => {
  const { buildWebhookMessageUrl } = await syncModulePromise;

  assert.equal(
    buildWebhookMessageUrl("https://discord.com/api/webhooks/123/token", { wait: true }),
    "https://discord.com/api/webhooks/123/token?wait=true",
  );
  assert.equal(
    buildWebhookMessageUrl("https://discord.com/api/webhooks/123/token", { messageId: "456" }),
    "https://discord.com/api/webhooks/123/token/messages/456",
  );
});

test("discord retry delay prefers rate limit headers and falls back safely", async () => {
  const { getDiscordRetryDelayMs } = await syncModulePromise;

  const headerDrivenDelay = getDiscordRetryDelayMs(
    {
      get(name) {
        if (name === "retry-after") {
          return "2";
        }

        return null;
      },
    },
    { retry_after: 50 },
    0,
  );
  const bodyDrivenDelay = getDiscordRetryDelayMs(
    {
      get() {
        return null;
      },
    },
    { retry_after: 1.5 },
    0,
  );
  const fallbackDelay = getDiscordRetryDelayMs(
    {
      get() {
        return null;
      },
    },
    {},
    2,
  );

  assert.equal(headerDrivenDelay, 2250);
  assert.equal(bodyDrivenDelay, 1750);
  assert.equal(fallbackDelay, 4000);
});

test("discord request retries 429 responses and succeeds on a later attempt", async () => {
  const { discordRequest } = await syncModulePromise;
  const sleepCalls = [];
  const logs = [];
  let fetchCount = 0;

  const result = await discordRequest("https://discord.com/api/webhooks/123/token", {
    method: "POST",
    body: {
      content: "hello",
    },
    fetchImpl: async () => {
      fetchCount += 1;

      if (fetchCount === 1) {
        return {
          ok: false,
          status: 429,
          headers: {
            get(name) {
              if (name === "retry-after") {
                return "2";
              }

              return null;
            },
          },
          async text() {
            return JSON.stringify({
              message: "You are being rate limited.",
              retry_after: 2,
            });
          },
        };
      }

      return {
        ok: true,
        status: 200,
        headers: {
          get() {
            return null;
          },
        },
        async text() {
          return JSON.stringify({
            id: "message-1",
          });
        },
      };
    },
    sleepImpl: async (milliseconds) => {
      sleepCalls.push(milliseconds);
    },
    logger: {
      info(message, details) {
        logs.push({ level: "info", message, details });
      },
      warn(message, details) {
        logs.push({ level: "warn", message, details });
      },
      error() {},
    },
  });

  assert.equal(fetchCount, 2);
  assert.deepEqual(sleepCalls, [2250]);
  assert.equal(result.id, "message-1");
  assert.equal(logs[0].level, "warn");
  assert.equal(logs[0].message, "Discord webhook rate limited; retrying request");
  assert.equal(logs[1].level, "info");
  assert.equal(logs[1].message, "Discord webhook request succeeded after retry");
});

test("discord request slot pacing waits when the next full-resync request would burst too quickly", async () => {
  const { waitForDiscordRequestSlot } = await syncModulePromise;
  const originalNow = Date.now;
  const sleepCalls = [];
  const logs = [];
  let now = 1000;

  Date.now = () => now;

  try {
    const requestContext = {
      minimumSpacingMs: 450,
      nextAllowedAt: 1300,
    };

    await waitForDiscordRequestSlot({
      method: "POST",
      requestContext,
      sleepImpl: async (milliseconds) => {
        sleepCalls.push(milliseconds);
        now += milliseconds;
      },
      logger: {
        info(message, details) {
          logs.push({ message, details });
        },
        warn() {},
        error() {},
      },
    });

    assert.deepEqual(sleepCalls, [300]);
    assert.equal(logs[0].message, "Throttling Discord webhook request");
    assert.equal(requestContext.nextAllowedAt, 1750);
  } finally {
    Date.now = originalNow;
  }
});
