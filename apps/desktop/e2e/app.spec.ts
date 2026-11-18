import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';

// Launching the package directory (not the bundle) makes Electron read the
// app's package.json, so name and version match a real install.
const appDir = join(import.meta.dirname, '..');

async function launch(userDataDir: string, lang: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [appDir, `--lang=${lang}`],
    env: { ...process.env, IDEBLOCK_USER_DATA_DIR: userDataDir },
  });
}

test.describe('application shell', () => {
  let userDataDir: string;

  test.beforeEach(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), 'ideblock-e2e-'));
  });

  test.afterEach(async () => {
    await rm(userDataDir, { recursive: true, force: true });
  });

  test('switches language and remembers it across restarts', async () => {
    let app = await launch(userDataDir, 'en-US');
    let window = await app.firstWindow();

    await expect(window.getByTestId('panel-blocks')).toContainText('Blocks');
    await window.getByTestId('language-select').selectOption('es');
    await expect(window.getByTestId('panel-blocks')).toContainText('Bloques');
    await expect(window.locator('html')).toHaveAttribute('lang', 'es');
    await app.close();

    app = await launch(userDataDir, 'en-US');
    window = await app.firstWindow();
    await expect(window.getByTestId('panel-blocks')).toContainText('Bloques');
    await app.close();
  });

  test('follows the system language by default', async () => {
    const app = await launch(userDataDir, 'es-AR');
    const window = await app.firstWindow();
    await expect(window.getByTestId('panel-code')).toContainText('Código');
    await expect(window.getByTestId('app-version')).toHaveText('Versión 0.1.0');
    await app.close();
  });

  test('scales the interface text', async () => {
    const app = await launch(userDataDir, 'en-US');
    const window = await app.firstWindow();
    const html = window.locator('html');

    await expect(html).toHaveCSS('font-size', '16px');
    await window.getByTestId('font-increase').click();
    await window.getByTestId('font-increase').click();
    await expect(html).toHaveCSS('font-size', '19.2px');
    await window.keyboard.press('Control+0');
    await expect(html).toHaveCSS('font-size', '16px');
    await app.close();
  });
});
