import type { Locator } from '@playwright/test';
import { expect, test } from './fixtures';

const toolchain = process.env['IDEBLOCK_TOOLCHAIN_TESTS'] === '1';

async function componentState(card: Locator): Promise<Record<string, unknown>> {
  return JSON.parse((await card.getAttribute('data-state')) ?? '{}') as Record<string, unknown>;
}

test.describe('simulator circuit', () => {
  test('adds, rewires and removes components', async ({ launchApp }) => {
    const { window } = await launchApp('es-AR');
    await window.getByTestId('simulator-add').click();
    await window.getByTestId('add-led').click();
    await expect(window.getByTestId('component-led1')).toContainText('LED');
    await expect(window.getByTestId('pin-led1-anode')).toHaveValue('13');

    await window.getByTestId('simulator-add').click();
    await window.getByTestId('add-led').click();
    // A second LED gets a free pin instead of the built-in LED pin.
    await expect(window.getByTestId('pin-led2-anode')).not.toHaveValue('13');

    await window.getByTestId('pin-led2-anode').selectOption('7');
    await expect(window.getByTestId('pin-led2-anode')).toHaveValue('7');
    await window
      .getByTestId('component-led2')
      .getByRole('button', { name: /Quitar/ })
      .click();
    await expect(window.getByTestId('component-led2')).toHaveCount(0);
  });

  test('explains boards that cannot be simulated yet', async ({ launchApp }) => {
    const { window } = await launchApp('es-AR');
    await window.getByTestId('board-select').selectOption('esp32-devkit');
    await window.getByTestId('simulator-start').click();
    await expect(window.getByTestId('simulator')).toContainText('todavía no funciona con ESP32');
  });
});

test.describe('running the simulator', () => {
  test.skip(!toolchain, 'toolchain tests are disabled');
  test.setTimeout(300_000);

  test('runs an example and reacts to the button', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('file-examples').click();
    await window.getByTestId('example-ButtonLed').click();
    await window.getByTestId('simulator-start').click();
    await expect(window.getByTestId('simulator-stop')).toBeVisible({ timeout: 240_000 });

    const led = window.getByTestId('component-led1');
    await expect.poll(async () => (await componentState(led))['brightness']).toBe(0);

    const press = window.getByTestId('press-button1');
    const box = await press.boundingBox();
    await window.mouse.move(box!.x + 5, box!.y + 5);
    await window.mouse.down();
    await expect.poll(async () => (await componentState(led))['brightness']).toBe(1);
    await expect(
      window.locator('.blocklyHighlighted, .blocklyPathSelected').first(),
    ).toBeAttached();
    await window.mouse.up();
    await expect.poll(async () => (await componentState(led))['brightness']).toBe(0);
  });

  test('shows simulated serial output in the serial monitor', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('file-examples').click();
    await window.getByTestId('example-SerialCounter').click();
    await window.getByTestId('simulator-start').click();
    await expect(window.getByTestId('simulator-stop')).toBeVisible({ timeout: 240_000 });

    await window.getByTestId('toggle-console').click();
    await window.getByTestId('console-tab-serial').click();
    await expect(window.getByTestId('serial-output')).toContainText("Hello! Let's count.");
    await expect(window.getByTestId('serial-output')).toContainText('2', { timeout: 10_000 });
  });
});
