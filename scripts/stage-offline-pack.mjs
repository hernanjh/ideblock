#!/usr/bin/env node
// Copies an offline pack, exported from File → Boards and libraries, to where
// the packager adds it to a school installer:
//   apps/desktop/resources/offline-pack
// The installed app imports it the first time it starts.
//
// Usage: IDEBLOCK_OFFLINE_PACK=<pack folder> node scripts/stage-offline-pack.mjs
//    or: node scripts/stage-offline-pack.mjs <pack folder>
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'apps', 'desktop', 'resources', 'offline-pack');
const source = process.argv[2] ?? process.env['IDEBLOCK_OFFLINE_PACK'];

if (!source) {
  console.error('Give the pack folder as an argument or in IDEBLOCK_OFFLINE_PACK.');
  process.exit(1);
}

const manifestPath = join(resolve(source), 'ideblock-pack.json');
if (!existsSync(manifestPath)) {
  console.error(`${source} has no ideblock-pack.json; export a pack from the app first.`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.platform !== process.platform || manifest.arch !== process.arch) {
  console.error(
    `The pack is for ${manifest.platform}-${manifest.arch}; build this installer on ` +
      `${process.platform}-${process.arch} with a pack made there.`,
  );
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(resolve(source), target, { recursive: true });
const cores = manifest.cores.map((core) => `${core.id} ${core.version}`).join(', ');
console.log(`Staged the offline pack (${cores || 'no boards'}) in ${target}`);
