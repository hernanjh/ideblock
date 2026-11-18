#!/usr/bin/env node
// Fails when an installed package uses a license that is not known to be
// compatible with GPL-3.0. Unknown licenses must be reviewed and added here
// on purpose, never silently accepted.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ALLOWED = new Set([
  '0BSD',
  'Apache-2.0',
  'BlueOak-1.0.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'GPL-2.0-or-later',
  'GPL-3.0',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'ISC',
  'LGPL-2.1-or-later',
  'LGPL-3.0',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'MIT',
  'MIT-0',
  // GPL-compatible through the secondary-license clause in section 3.3.
  'MPL-2.0',
  'OFL-1.1',
  'Python-2.0',
  'Unlicense',
  'WTFPL',
  'Zlib',
]);

// Packages used only while developing or building; they are never shipped
// inside the application, so their licenses do not need GPL compatibility.
const BUILD_ONLY_EXCEPTIONS = new Map([
  ['caniuse-lite', 'CC-BY-4.0 data used by the build tooling only'],
]);

// Non-SPDX spellings found in published manifests, checked against the package's
// LICENSE file before being listed here.
const SPELLINGS = new Map([['Apache 2.0', 'Apache-2.0']]);

function normalize(license) {
  if (!license) return [];
  if (typeof license === 'object') license = license.type;
  const raw = String(license).trim();
  const cleaned = (SPELLINGS.get(raw) ?? raw).replace(/[()]/g, '').trim();
  // "A OR B" is satisfied by either option; "A AND B" needs both.
  if (cleaned.includes(' OR ')) {
    return [cleaned.split(' OR ').map((part) => part.trim())];
  }
  return cleaned.split(' AND ').map((part) => [part.trim()]);
}

function isAllowed(license) {
  const clauses = normalize(license);
  return clauses.length > 0 && clauses.every((options) => options.some((id) => ALLOWED.has(id)));
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (entry.name === '.bin' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.name.startsWith('@')) {
      yield* walk(full);
      continue;
    }
    const manifest = join(full, 'package.json');
    if (existsSync(manifest)) {
      yield manifest;
      yield* walk(join(full, 'node_modules'));
    }
  }
}

const problems = [];
const seen = new Set();
for (const manifestPath of walk(join(root, 'node_modules'))) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!manifest.name || manifest.name.startsWith('@ideblock/')) continue;
  const key = `${manifest.name}@${manifest.version}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const license = manifest.license ?? manifest.licenses?.[0];
  if (isAllowed(license) || BUILD_ONLY_EXCEPTIONS.has(manifest.name)) continue;
  problems.push(`${key}: ${JSON.stringify(license ?? 'UNKNOWN')}`);
}

if (problems.length > 0) {
  console.error('Packages with licenses that need review:');
  for (const problem of problems.sort()) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`License check passed for ${seen.size} packages.`);
