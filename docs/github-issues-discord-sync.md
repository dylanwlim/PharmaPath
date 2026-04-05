# GitHub issues to Discord sync

This repo includes a GitHub Actions workflow that mirrors open GitHub issues into one Discord channel. Each open issue is mirrored into one or more Discord webhook messages, and the workflow reconciles those messages as the issue changes.

## Files

- Workflow: `.github/workflows/github-issues-discord-sync.yml`
- Sync script: `scripts/github/discord-issue-sync.mjs`
- Durable mapping store: `discord-issue-sync-state` branch at `.github/discord-issue-sync/issues.json`

## Required secret

- `DISCORD_ISSUES_WEBHOOK_URL`
  Store the full Discord webhook URL in the repo or org Actions secrets.

The workflow uses the built-in `GITHUB_TOKEN` with `contents: write`, so no extra GitHub PAT is required unless your org policy blocks branch/file writes from `GITHUB_TOKEN`. If that happens, set `DISCORD_ISSUE_SYNC_GITHUB_TOKEN` as an environment override in the workflow and give it repo contents write access.

## What the workflow does

- `issues` events:
  `opened`, `reopened`, `edited`, `closed`, `deleted`
- Also listens for:
  `labeled`, `unlabeled`, `assigned`, `unassigned`
  so the labels and assignees shown in Discord stay current.
- `workflow_dispatch`:
  runs a full resync by fetching the current open issues from the GitHub Issues API.

Pull requests are excluded during resync and ignored on event handling.

## Message format

The Discord rendering uses the full issue body, not a clipped preview. The layout is:

- issue number and title
- full issue body
- issue state
- labels
- assignees
- direct GitHub link

Multiline paragraphs, bullets, and spacing are preserved. If the rendered issue exceeds Discord embed limits, the workflow creates deterministic continuation messages and updates or deletes those extra messages on later edits.

## Durable mapping

The sync keeps a JSON mapping from issue number to Discord message ids in a dedicated branch:

- Branch: `discord-issue-sync-state`
- File: `.github/discord-issue-sync/issues.json`

Each state entry stores a `messageIds` array. Older single-message entries with `messageId` are read and upgraded automatically on the next sync.

Why this approach:

- durable across workflow runs
- simple to inspect and recover
- does not pollute `main`
- does not require external storage

The branch is created automatically on first successful run.

## Manual full resync

Run the workflow manually from the Actions tab:

1. Open `Sync GitHub issues to Discord`
2. Click `Run workflow`

The resync job will:

- fetch all current open issues from the GitHub Issues API
- exclude pull requests
- update existing mapped Discord messages
- recreate messages whose stored Discord message id is gone
- create or delete continuation messages when the full rendered body grows or shrinks
- delete mapped Discord messages for issues that are no longer open
- rewrite the mapping file with the latest open-issue state

## Failure handling and tradeoffs

- Runs are serialized with a workflow concurrency group to reduce duplicate posts during bursty issue activity.
- Missing mapping entries are handled without crashing:
  an open issue gets a new Discord message, and a closed/deleted issue is logged and skipped.
- Discord 404s on edit/delete are treated as recoverable:
  the workflow recreates missing open-issue messages, trims stale continuation messages, and drops stale closed-issue mappings.

Webhook-only Discord access cannot list channel history. That means a fully orphaned message that no longer has any saved mapping cannot be auto-discovered during recovery. In normal operation the state branch prevents duplicates; if the state branch is manually deleted or a run fails after Discord create but before state persistence, do a one-time manual cleanup of the orphaned message, then rerun the full resync.

## Setup checklist

1. Create or choose the Discord channel that should act as the live issue board.
2. Create a webhook for that channel.
3. Add the webhook URL as the `DISCORD_ISSUES_WEBHOOK_URL` Actions secret.
4. Commit the workflow and script in this repo.
5. Run the workflow once with `workflow_dispatch` to seed the mapping branch and current open issues.

If you pasted a live webhook URL into chat or any other unsafe place, rotate it in Discord before storing the replacement value as the secret.
