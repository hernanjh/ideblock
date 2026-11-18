import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_SETTINGS } from '@ideblock/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SettingsStore } from '../src/main/settings-store';

describe('SettingsStore', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ideblock-settings-'));
    file = join(dir, 'nested', 'settings.json');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('starts with defaults when no file exists', async () => {
    const store = new SettingsStore(file);
    expect(await store.load()).toEqual(DEFAULT_SETTINGS);
  });

  it('recovers from a corrupt file', async () => {
    const store = new SettingsStore(join(dir, 'settings.json'));
    await writeFile(join(dir, 'settings.json'), '{not json', 'utf8');
    expect(await store.load()).toEqual(DEFAULT_SETTINGS);
  });

  it('persists updates and reloads them', async () => {
    const store = new SettingsStore(file);
    await store.load();
    await store.update({ language: 'es', fontScale: 1.3 });

    const reloaded = new SettingsStore(file);
    expect(await reloaded.load()).toEqual({ ...DEFAULT_SETTINGS, language: 'es', fontScale: 1.3 });
    expect(JSON.parse(await readFile(file, 'utf8'))).toMatchObject({ language: 'es' });
  });

  it('rejects invalid patches without changing state', async () => {
    const store = new SettingsStore(file);
    await store.load();
    await expect(store.update({ theme: 'neon' })).rejects.toThrow();
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the last value when updates overlap', async () => {
    const store = new SettingsStore(file);
    await store.load();
    await Promise.all([store.update({ fontScale: 1.1 }), store.update({ fontScale: 1.4 })]);
    const reloaded = new SettingsStore(file);
    expect((await reloaded.load()).fontScale).toBe(1.4);
  });
});
