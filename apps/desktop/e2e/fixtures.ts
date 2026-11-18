/// <reference lib="dom" />
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  _electron as electron,
  test as base,
  type ElectronApplication,
  type Page,
} from '@playwright/test';

// Launching the package directory (not the bundle) makes Electron read the
// app's package.json, so name and version match a real install.
const appDir = join(import.meta.dirname, '..');

export interface AppHandle {
  app: ElectronApplication;
  window: Page;
}

interface Fixtures {
  userDataDir: string;
  launchApp: (lang?: string) => Promise<AppHandle>;
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  userDataDir: async ({}, use) => {
    const dir = await mkdtemp(join(tmpdir(), 'ideblock-e2e-'));
    await use(dir);
    await rm(dir, { recursive: true, force: true });
  },
  launchApp: async ({ userDataDir }, use) => {
    const launched: ElectronApplication[] = [];
    await use(async (lang = 'en-US') => {
      const app = await electron.launch({
        args: [appDir, `--lang=${lang}`],
        env: { ...process.env, IDEBLOCK_USER_DATA_DIR: userDataDir },
      });
      launched.push(app);
      const window = await app.firstWindow();
      await window.getByTestId('workspace').waitFor();
      return { app, window };
    });
    await Promise.all(launched.map((app) => app.close().catch(() => undefined)));
  },
});

export { expect } from '@playwright/test';

export async function openSettings(window: Page): Promise<void> {
  await window.getByTestId('open-settings').click();
  await window.getByTestId('settings-dialog').waitFor({ state: 'visible' });
}

/** Text shown in the code editor, with Monaco's non-breaking spaces normalized. */
export async function editorText(window: Page): Promise<string> {
  return window.evaluate(() => {
    const lines = document.querySelectorAll('[data-testid="code-editor"] .view-line');
    const sorted = [...lines].sort(
      (a, b) => parseFloat((a as HTMLElement).style.top) - parseFloat((b as HTMLElement).style.top),
    );
    return sorted.map((line) => (line.textContent ?? '').replace(/\u00a0/g, ' ')).join('\n');
  });
}
