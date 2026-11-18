import { expect, openSettings, test } from './fixtures';

test.describe('application shell', () => {
  test('switches language and remembers it across restarts', async ({ launchApp }) => {
    const first = await launchApp('en-US');
    const { window } = first;
    await expect(window.getByTestId('panel-blocks')).toContainText('Blocks');

    await openSettings(window);
    await window.getByTestId('language-select').selectOption('es');
    await expect(window.getByTestId('panel-blocks')).toContainText('Bloques');
    await expect(window.locator('html')).toHaveAttribute('lang', 'es');
    await first.app.close();

    const second = await launchApp('en-US');
    await expect(second.window.getByTestId('panel-blocks')).toContainText('Bloques');
  });

  test('follows the system language by default', async ({ launchApp }) => {
    const { window } = await launchApp('es-AR');
    await expect(window.getByTestId('toggle-simulator')).toContainText('Simulador');
    await expect(window.getByTestId('app-version')).toHaveText('Versión 0.1.0');
  });

  test('scales the interface text', async ({ launchApp }) => {
    const { window } = await launchApp();
    const html = window.locator('html');

    await expect(html).toHaveCSS('font-size', '16px');
    await openSettings(window);
    await window.getByTestId('font-increase').click();
    await window.getByTestId('font-increase').click();
    await expect(html).toHaveCSS('font-size', '19.2px');
    await window.getByTestId('settings-close').click();
    await window.keyboard.press('Control+0');
    await expect(html).toHaveCSS('font-size', '16px');
  });
});
