#!/usr/bin/env node
// Downloads the pinned arduino-cli release for a platform, verifies its
// checksum and places the binary where the app and the packager expect it:
//   apps/desktop/resources/bin/arduino-cli[.exe]
//
// Usage: node scripts/fetch-arduino-cli.mjs [--platform win32|darwin|linux] [--arch x64|arm64]
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '1.6.0';

// Copied from https://downloads.arduino.cc/arduino-cli/1.6.0-checksums.txt.
// Pinning them here means a tampered download can never be trusted.
const ARCHIVES = {
  'linux-x64': [
    'Linux_64bit.tar.gz',
    '321ee249f44c78053234fec0f36101092bc6021bf24939e15e0cc2449c5ed250',
  ],
  'linux-arm64': [
    'Linux_ARM64.tar.gz',
    '2ed4e1436bb3be1265966af8eba95dd25e28f3a9f92d0a58d371ed14dbaf550f',
  ],
  'win32-x64': [
    'Windows_64bit.zip',
    '2769b9b282ce597db9679d8ec14d726d57004ca4205ef4d7a795bf36b6cdc9d8',
  ],
  'win32-arm64': [
    'Windows_ARM64.zip',
    'ac31be09fcb5ca34af5450ba5a3106ea23394561d6a187cb9f4074756d18b0c6',
  ],
  'darwin-x64': [
    'macOS_64bit.tar.gz',
    'af6a30cf5f57cc076b45fe55c6fd389440156f70706e7f8d3302a11a9fe32913',
  ],
  'darwin-arm64': [
    'macOS_ARM64.tar.gz',
    'dc70f037fcbc8e7add892282bed5bab5eac317ff00bf0dd2f21e4a8e1d338a1c',
  ],
};

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const platform = option('platform', process.platform);
const arch = option('arch', process.arch);
const entry = ARCHIVES[`${platform}-${arch}`];
if (!entry) {
  console.error(`No arduino-cli build for ${platform}-${arch}`);
  process.exit(1);
}
const [suffix, expectedSha256] = entry;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const binDir = join(root, 'apps', 'desktop', 'resources', 'bin');
const binaryName = platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli';
const target = join(binDir, binaryName);
const stamp = join(binDir, 'arduino-cli.version');

if (
  existsSync(target) &&
  existsSync(stamp) &&
  readFileSync(stamp, 'utf8') === `${VERSION} ${platform}-${arch}`
) {
  console.log(`arduino-cli ${VERSION} is already present.`);
  process.exit(0);
}

const fileName = `arduino-cli_${VERSION}_${suffix}`;
const url = `https://downloads.arduino.cc/arduino-cli/${fileName}`;
console.log(`Downloading ${url}`);
const response = await fetch(url);
if (!response.ok) {
  console.error(`Download failed: HTTP ${response.status}`);
  process.exit(1);
}
const archive = Buffer.from(await response.arrayBuffer());
const actualSha256 = createHash('sha256').update(archive).digest('hex');
if (actualSha256 !== expectedSha256) {
  console.error(
    `Checksum mismatch for ${fileName}: expected ${expectedSha256}, got ${actualSha256}`,
  );
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), 'arduino-cli-'));
try {
  const archivePath = join(work, fileName);
  writeFileSync(archivePath, archive);
  // bsdtar, shipped with Windows 10 and macOS, also extracts zip files.
  execFileSync('tar', ['-xf', archivePath, '-C', work], { stdio: 'inherit' });
  mkdirSync(binDir, { recursive: true });
  renameSync(join(work, binaryName), target);
  renameSync(join(work, 'LICENSE.txt'), join(binDir, 'arduino-cli.LICENSE.txt'));
  if (platform !== 'win32') chmodSync(target, 0o755);
  writeFileSync(stamp, `${VERSION} ${platform}-${arch}`);
  console.log(`arduino-cli ${VERSION} ready at ${target}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
