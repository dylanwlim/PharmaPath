"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const syncModulePromise = import("../scripts/github/discord-issue-sync.mjs");

test("discord issue payload includes the required compact fields", async () => {
  const { buildDiscordMessagePayload } = await syncModulePromise;

  const payload = buildDiscordMessagePayload(
    {
      number: 42,
      title: "Issue title",
      state: "open",
      labels: [{ name: "bug" }, { name: "urgent" }],
      assignees: [{ login: "zoe" }, { login: "alex" }],
      body: "First line.\n\nSecond line.",
      html_url: "https://github.com/example/repo/issues/42",
      updated_at: "2026-04-05T12:00:00.000Z",
      created_at: "2026-04-05T11:00:00.000Z",
    },
    "example/repo",
  );

  const [embed] = payload.embeds;

  assert.equal(embed.title, "#42 Issue title");
  assert.equal(embed.url, "https://github.com/example/repo/issues/42");
  assert.equal(embed.description, "First line. Second line.");
  assert.equal(embed.footer.text, "example/repo");
  assert.deepEqual(
    embed.fields.map((field) => field.name),
    ["State", "Labels", "Assignees", "GitHub"],
  );
  assert.equal(embed.fields[0].value, "OPEN");
  assert.equal(embed.fields[1].value, "`bug`, `urgent`");
  assert.equal(embed.fields[2].value, "`@\u200balex`, `@\u200bzoe`");
  assert.equal(embed.fields[3].value, "[Open issue](https://github.com/example/repo/issues/42)");
});

test("state normalization keeps issue keys sorted and message ids stable as strings", async () => {
  const { normalizeState } = await syncModulePromise;

  const state = normalizeState({
    issues: {
      10: {
        issueNumber: 10,
        messageId: 999,
      },
      2: {
        issueNumber: 2,
        messageId: "123",
        title: "Earlier issue",
      },
    },
  });

  assert.deepEqual(Object.keys(state.issues), ["2", "10"]);
  assert.equal(state.issues["10"].messageId, "999");
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
