#!/usr/bin/env node
// Sync the shared agent/coordinator instructions from the template repository.
//
// Canonical source: OrbiterToad/agent-coordinator-template (sync/).
// Copy this script into a consuming project (for example as
// tools/sync-agent-instructions.mjs) together with a manifest file named
// .agent-template.json:
//
//   {
//     "repository": "OrbiterToad/agent-coordinator-template",
//     "ref": "main",
//     "files": { "AGENTS.md": "AGENTS.md", "CORDINATOR_AGENT.md": "CORDINATOR_AGENT.md" }
//   }
//
// Keys are paths in the template, values are paths in this repository.
//
// Usage:
//   node tools/sync-agent-instructions.mjs            # write template files locally
//   node tools/sync-agent-instructions.mjs --check    # report drift, exit 1 if any
//
// A GitHub token is read from GITHUB_TOKEN, GH_TOKEN, or a repository-root
// GITHUB_TOKEN file. A token is required while the template repository is
// private. Token values are never printed.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const repoRoot = resolve(import.meta.dirname, '..');
const manifestPath = resolve(repoRoot, '.agent-template.json');
const checkOnly = process.argv.includes('--check');

async function readToken() {
  const fromEnv = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  try {
    const fromFile = await readFile(resolve(repoRoot, 'GITHUB_TOKEN'), 'utf8');
    return fromFile.trim() || null;
  } catch {
    return null;
  }
}

async function fetchTemplateFile(repository, ref, path, token) {
  const url = `https://api.github.com/repos/${repository}/contents/${path}?ref=${encodeURIComponent(ref)}`;
  const headers = {
    accept: 'application/vnd.github.raw+json',
    'user-agent': 'sync-agent-instructions',
    'x-github-api-version': '2022-11-28',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const hint =
      response.status === 404 && !token
        ? ' (the template repository is private: provide a token via GITHUB_TOKEN)'
        : '';
    throw new Error(
      `GET ${repository}/${path}@${ref} failed: ${response.status} ${response.statusText}${hint}`,
    );
  }
  return response.text();
}

async function readLocal(path) {
  try {
    return await readFile(resolve(repoRoot, path), 'utf8');
  } catch {
    return null;
  }
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const { repository, ref = 'main', files } = manifest;
if (!repository || !files || Object.keys(files).length === 0) {
  console.error(
    `${manifestPath} must define "repository" and a non-empty "files" map.`,
  );
  process.exit(2);
}

const token = await readToken();
const drifted = [];

for (const [templatePath, localPath] of Object.entries(files)) {
  const expected = await fetchTemplateFile(
    repository,
    ref,
    templatePath,
    token,
  );
  const actual = await readLocal(localPath);
  if (actual === expected) {
    console.log(`up to date: ${localPath}`);
    continue;
  }
  drifted.push(localPath);
  if (checkOnly) {
    console.log(
      `drift: ${localPath} differs from ${repository}/${templatePath}@${ref}`,
    );
    continue;
  }
  await mkdir(dirname(resolve(repoRoot, localPath)), { recursive: true });
  await writeFile(resolve(repoRoot, localPath), expected);
  console.log(`updated: ${localPath}`);
}

if (drifted.length === 0) {
  console.log('Agent instructions match the template.');
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `\n${drifted.length} file(s) drifted from ${repository}@${ref}: ${drifted.join(', ')}\n` +
      'Run the sync script without --check (or the sync workflow) to update them.',
  );
  process.exit(1);
}

console.log(`\nSynced ${drifted.length} file(s) from ${repository}@${ref}.`);
