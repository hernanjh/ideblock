import type { Locator } from '@playwright/test';
import { expect, test } from './fixtures';

const toolchain = process.env['IDEBLOCK_TOOLCHAIN_TESTS'] === '1';

async function componentState(card: Locator): Promise<Record<string, unknown>> {
  return JSON.parse((await card.getAttribute('data-state')) ?? '{}') as Record<string, unknown>;
}

test.describe('circuit', () => {
  test('adds, rewires and removes components', async ({ launchApp }) => {
    const { window } = await launchApp('es-AR');
    await window.getByTestId('rail-circuit').click();
    await window.getByTestId('add-led').click();
    await expect(window.getByTestId('properties')).toContainText('LED');
    await expect(window.getByTestId('pin-led1-anode')).toHaveValue('13');

    await window.getByTestId('add-led').click();
    // A second LED gets a free pin instead of the built-in LED pin.
    await expect(window.getByTestId('pin-led2-anode')).not.toHaveValue('13');
    await window.getByTestId('pin-led2-anode').selectOption('13');
    await expect(window.getByTestId('pin-conflict')).toBeVisible();
    await window.getByTestId('pin-led2-anode').selectOption('7');
    await expect(window.getByTestId('pin-conflict')).toHaveCount(0);

    await window.getByTestId('property-name').fill('rojo');
    await expect(window.getByTestId('scene-item-led2')).toContainText('rojo');
    await window.getByTestId('property-remove').click();
    await expect(window.getByTestId('scene-item-led2')).toHaveCount(0);

    await window.getByTestId('rail-program').click();
    await expect(window.getByTestId('component-led1')).toBeVisible();
  });

  test('undoes and redoes circuit changes', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('rail-circuit').click();
    await expect(window.getByTestId('circuit-undo')).toBeDisabled();
    await window.getByTestId('add-led').click();
    await window.getByTestId('add-buzzer').click();
    await expect(window.getByTestId('scene-item-buzzer1')).toBeVisible();

    await window.getByTestId('circuit-undo').click();
    await expect(window.getByTestId('scene-item-buzzer1')).toHaveCount(0);
    await expect(window.getByTestId('scene-item-led1')).toBeVisible();
    await window.keyboard.press('Control+z');
    await expect(window.getByTestId('scene-item-led1')).toHaveCount(0);

    await window.getByTestId('circuit-redo').click();
    await expect(window.getByTestId('scene-item-led1')).toBeVisible();
    await window.keyboard.press('Control+y');
    await expect(window.getByTestId('scene-item-buzzer1')).toBeVisible();
    await expect(window.getByTestId('circuit-redo')).toBeDisabled();
  });

  test('moves components by dragging them', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('rail-circuit').click();
    await window.getByTestId('add-pushbutton').click();
    const item = window.getByTestId('scene-item-pushbutton1');
    const before = (await item.boundingBox())!;
    await window.mouse.move(before.x + 10, before.y + 10);
    await window.mouse.down();
    await window.mouse.move(before.x + 90, before.y + 70, { steps: 6 });
    await window.mouse.up();
    await expect.poll(async () => (await item.boundingBox())!.x).toBeGreaterThan(before.x + 30);
  });

  test('warns when the blocks drive a part the circuit does not have', async ({ launchApp }) => {
    const { window } = await launchApp('es-AR');
    await window.getByTestId('file-examples').click();
    await window.getByTestId('example-Blink').click();
    await expect(window.getByTestId('mismatches')).toHaveCount(0);

    await window.getByTestId('rail-circuit').click();
    await window.getByTestId('scene-item-led1').click();
    await window.getByTestId('property-remove').click();
    await window.getByTestId('rail-program').click();
    await expect(window.getByTestId('mismatches')).toContainText('LED en el pin 13');

    await window.getByTestId('mismatch-add-led').click();
    await expect(window.getByTestId('mismatches')).toHaveCount(0);
    await expect(window.getByTestId('component-led1')).toBeVisible();

    // A part wired to another pin is moved instead of added twice.
    await window.getByTestId('file-examples').click();
    await window.getByTestId('example-NeoPixelChase').click();
    await window.getByTestId('confirm-discard').click();
    await window.getByTestId('rail-circuit').click();
    await window.getByTestId('scene-item-ring1').click();
    await window.getByTestId('pin-ring1-din').selectOption('7');
    await window.getByTestId('rail-program').click();
    await window.getByTestId('mismatch-move-neopixel-ring').click();
    await expect(window.getByTestId('mismatches')).toHaveCount(0);
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

  test('simulates the Raspberry Pi Pico', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('file-examples').click();
    await window.getByTestId('example-Dimmer').click();
    await expect(window.getByTestId('project-name')).toHaveValue('LED dimmer');
    await window.getByTestId('board-select').selectOption('pico');
    await window.getByTestId('simulator-start').click();
    await expect(window.getByTestId('simulator-stop')).toBeVisible({ timeout: 280_000 });

    const led = window.getByTestId('component-led1');
    await window.getByTestId('slider-pot1').fill('1023');
    await expect
      .poll(async () => Number((await componentState(led))['brightness']), { timeout: 10_000 })
      .toBeGreaterThan(0.9);
  });

  test('shows simulated serial output in the serial monitor', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('file-examples').click();
    await window.getByTestId('example-SerialCounter').click();
    await window.getByTestId('simulator-start').click();
    await expect(window.getByTestId('simulator-stop')).toBeVisible({ timeout: 240_000 });

    await window.getByTestId('console-tab-serial').click();
    await expect(window.getByTestId('serial-output')).toContainText("Hello! Let's count.");
    await expect(window.getByTestId('serial-output')).toContainText('2', { timeout: 10_000 });
  });
});
