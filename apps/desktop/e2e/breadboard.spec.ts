import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const toolchain = process.env['IDEBLOCK_TOOLCHAIN_TESTS'] === '1';

async function centre(window: Page, terminal: string): Promise<{ x: number; y: number }> {
  const box = (await window.locator(`[data-terminal="${terminal}"]`).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Drags a part so that one of its legs lands on a breadboard hole. */
async function plug(window: Page, part: string, leg: string, hole: string): Promise<void> {
  const from = await centre(window, `${part}:${leg}`);
  const to = await centre(window, `breadboard1:${hole}`);
  const box = (await window.getByTestId(`scene-item-${part}`).boundingBox())!;
  // Grab the part away from its legs, where wires start instead.
  const grab = { x: box.x + box.width / 2, y: box.y + 4 };
  await window.mouse.move(grab.x, grab.y);
  await window.mouse.down();
  await window.mouse.move(grab.x + (to.x - from.x), grab.y + (to.y - from.y), { steps: 8 });
  await window.mouse.up();
}

async function wire(window: Page, from: string, to: string): Promise<void> {
  const start = await centre(window, from);
  const end = await centre(window, to);
  await window.mouse.move(start.x, start.y);
  await window.mouse.down();
  await window.mouse.move((start.x + end.x) / 2, (start.y + end.y) / 2, { steps: 4 });
  await window.mouse.move(end.x, end.y, { steps: 4 });
  await window.mouse.up();
}

test.describe('hand wiring', () => {
  test('builds an LED circuit on the breadboard', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.setViewportSize({ width: 1600, height: 1000 });
    await window.getByTestId('rail-circuit').click();
    await window.getByTestId('wiring-manual').click();
    await expect(window.getByTestId('circuit-check')).toContainText('Add a breadboard');

    await window.getByTestId('add-breadboard').click();
    await window.getByTestId('add-led').click();
    await window.getByTestId('add-resistor').click();

    await plug(window, 'led1', 'A', 'e10');
    await plug(window, 'resistor1', '1', 'b9');
    await wire(window, 'board:13', 'breadboard1:a10');
    await wire(window, 'breadboard1:a15', 'board:GND');

    await window.getByTestId('scene-item-led1').click();
    await expect(window.getByTestId('reached-led1-anode')).toContainText('13');
    await window.getByTestId('scene-item-resistor1').click();
    await window.getByTestId('property-remove').click();
    await expect(window.getByTestId('issue-noGround')).toBeVisible();
    await wire(window, 'led1:C', 'board:GND.top');
    await expect(window.getByTestId('issue-noResistor')).toBeVisible();

    // Back to automatic wiring, the pin found by the wires is kept.
    await window.getByTestId('wiring-auto').click();
    await window.getByTestId('scene-item-led1').click();
    await expect(window.getByTestId('pin-led1-anode')).toHaveValue('13');
    await expect(window.getByTestId('scene-item-breadboard1')).toHaveCount(0);
  });

  test.describe('in the simulator', () => {
    test.skip(!toolchain, 'toolchain tests are disabled');
    test.setTimeout(300_000);

    test('keeps an example working and burns an LED without its resistor', async ({
      launchApp,
    }) => {
      const { window } = await launchApp();
      await window.setViewportSize({ width: 1600, height: 1000 });
      await window.getByTestId('file-examples').click();
      await window.getByTestId('example-Blink').click();
      await window.getByTestId('rail-circuit').click();
      await window.getByTestId('wiring-manual').click();
      // Switching turns the automatic wiring into wires and a resistor.
      await expect(window.getByTestId('circuit-ok')).toBeVisible();

      const led = window.getByTestId('scene-item-led1');
      await window.getByTestId('simulator-start').click();
      await expect(window.getByTestId('simulator-stop')).toBeVisible({ timeout: 240_000 });
      await expect
        .poll(async () => JSON.parse((await led.getAttribute('data-state')) ?? '{}').brightness, {
          timeout: 10_000,
        })
        .toBe(1);
      await expect(led).not.toHaveAttribute('data-burned');
      await window.getByTestId('simulator-stop').click();

      await window.getByTestId('scene-item-resistor1').click();
      await window.getByTestId('property-remove').click();
      await wire(window, 'board:13', 'led1:A');
      await expect(window.getByTestId('issue-noResistor')).toBeVisible();
      await window.getByTestId('simulator-start').click();
      await expect(led).toHaveAttribute('data-burned', 'true', { timeout: 240_000 });
    });
  });
});
