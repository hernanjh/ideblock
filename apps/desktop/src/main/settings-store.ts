import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  DEFAULT_SETTINGS,
  sanitizeSettings,
  settingsPatchSchema,
  type Settings,
} from '@ideblock/shared';

export class SettingsStore {
  private current: Settings = { ...DEFAULT_SETTINGS };
  private pendingWrite: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async load(): Promise<Settings> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      this.current = sanitizeSettings(JSON.parse(raw));
    } catch {
      // A missing or corrupt file must never prevent the app from starting.
      this.current = { ...DEFAULT_SETTINGS };
    }
    return this.get();
  }

  get(): Settings {
    return { ...this.current };
  }

  async update(patch: unknown): Promise<Settings> {
    const parsed = settingsPatchSchema.parse(patch);
    this.current = sanitizeSettings({ ...this.current, ...parsed });
    const snapshot = this.get();
    // Writes are serialized so a slow disk cannot reorder consecutive updates.
    this.pendingWrite = this.pendingWrite.then(() => this.persist(snapshot));
    await this.pendingWrite;
    return snapshot;
  }

  private async persist(settings: Settings): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
    await rename(tempPath, this.filePath);
  }
}
