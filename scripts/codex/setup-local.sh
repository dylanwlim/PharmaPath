#!/usr/bin/env bash
set -euo pipefail

required_node_major="$(tr -d '[:space:]' < .nvmrc)"
required_node_label="${required_node_major}.x"
node_fix_command="nvm install ${required_node_major} && nvm use ${required_node_major}"

if ! command -v node >/dev/null 2>&1; then
  echo "PharmaPath local setup requires Node ${required_node_label}, but no node executable was found." >&2
  echo "Run: ${node_fix_command}" >&2
  echo "If you do not use nvm, install Node ${required_node_label} with your local version manager and rerun." >&2
  exit 1
fi

current_node_version="$(node -p 'process.versions.node')"
current_node_major="$(node -p 'process.versions.node.split(".")[0]')"

if [ "$current_node_major" != "$required_node_major" ]; then
  echo "PharmaPath local setup requires Node ${required_node_label}, but found Node ${current_node_version}." >&2
  echo "Run: ${node_fix_command}" >&2
  echo "If you do not use nvm, install Node ${required_node_label} with your local version manager and rerun." >&2
  exit 1
fi

need_install=false

if [ ! -d node_modules ]; then
  need_install=true
elif [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  need_install=true
fi

if [ "$need_install" = true ]; then
  npm ci
else
  echo "Dependencies already installed; skipping npm ci."
fi

if [ ! -d public/medication-search ] || [ ! -f public/medication-index.snapshot.json.gz ]; then
  npm run medications:build-assets
else
  echo "Medication assets already present; skipping asset build."
fi

if [ ! -f .env.local ]; then
  echo "Missing .env.local. Copy .env.example and set only the local variable names you need."
fi

mkdir -p tmp output/playwright
