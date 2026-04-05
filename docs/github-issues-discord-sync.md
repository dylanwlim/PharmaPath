# GitHub issues to Discord sync

This repo includes a GitHub Actions workflow that mirrors open GitHub issues into one Discord channel. Each open issue is kept to one Discord webhook message, and the workflow updates or deletes that message as the issue changes.

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

Each Discord message includes:

- issue number and title
- issue state
- labels
- assignees
- short body preview
- direct GitHub link

The title links to the issue, and the message uses Discord webhook create, edit, and delete endpoints so updates stay tied to the same message id.

## Durable mapping

The sync keeps a JSON mapping from issue number to Discord message id in a dedicated branch:

- Branch: `discord-issue-sync-state`
- File: `.github/discord-issue-sync/issues.json`

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
- delete mapped Discord messages for issues that are no longer open
- rewrite the mapping file with the latest open-issue state

## Failure handling and tradeoffs

- Runs are serialized with a workflow concurrency group to reduce duplicate posts during bursty issue activity.
- Missing mapping entries are handled without crashing:
  an open issue gets a new Discord message, and a closed/deleted issue is logged and skipped.
- Discord 404s on edit/delete are treated as recoverable:
  the workflow recreates missing open-issue messages and drops stale closed-issue mappings.

Webhook-only Discord access cannot list channel history. That means a fully orphaned message that no longer has any saved mapping cannot be auto-discovered during recovery. In normal operation the state branch prevents duplicates; if the state branch is manually deleted or a run fails after Discord create but before state persistence, do a one-time manual cleanup of the orphaned message, then rerun the full resync.

## Setup checklist

1. Create or choose the Discord channel that should act as the live issue board.
2. Create a webhook for that channel.
3. Add the webhook URL as the `DISCORD_ISSUES_WEBHOOK_URL` Actions secret.
4. Commit the workflow and script in this repo.
5. Run the workflow once with `workflow_dispatch` to seed the mapping branch and current open issues.

If you pasted a live webhook URL into chat or any other unsafe place, rotate it in Discord before storing the replacement value as the secret.
