import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element is not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function openCategory(window: Page, name: string): Promise<void> {
  await window.locator('.blocklyToolboxCategory', { hasText: name }).click();
}

/** Drags the first flyout block containing `text` into the "repeat forever" input. */
async function dragIntoLoop(window: Page, text: string, loopLabel: string): Promise<void> {
  const sourceText = window.locator('.blocklyFlyout .blocklyText', { hasText: text }).first();
  const sourceBlock = window
    .locator('.blocklyFlyout .blocklyDraggable')
    .filter({ has: window.locator('.blocklyText', { hasText: text }) })
    .first();
  const label = window.locator('.blocklyMainBackground ~ g .blocklyText', { hasText: loopLabel });
  const grab = await center(sourceText);
  const blockBox = await sourceBlock.boundingBox();
  const labelBox = await label.first().boundingBox();
  if (!blockBox || !labelBox) throw new Error('Blocks not found');

  // Move the block's top-left corner, not the grab point, to the input slot.
  const offsetX = grab.x - blockBox.x;
  const offsetY = grab.y - blockBox.y;
  const targetX = labelBox.x + 16 + offsetX;
  const targetY = labelBox.y + labelBox.height + 8 + offsetY;

  await window.mouse.move(grab.x, grab.y);
  await window.mouse.down();
  await window.mouse.move(grab.x + 60, grab.y + 60, { steps: 5 });
  await window.mouse.move(targetX, targetY, { steps: 10 });
  await window.mouse.up();
}

test.describe('block editor', () => {
  test('starts with an empty program', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('view-split').click();
    await expect(window.getByTestId('generated-code')).toHaveText(
      'void setup() {\n}\n\nvoid loop() {\n}\n',
    );
    await expect(window.locator('.blocklyText', { hasText: 'repeat forever' })).toBeVisible();
  });

  test('generates code for blocks added to the program', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('view-split').click();
    await openCategory(window, 'Outputs');
    await dragIntoLoop(window, 'LED on pin', 'repeat forever');

    const code = window.getByTestId('generated-code');
    await expect(code).toContainText('pinMode(13, OUTPUT);');
    await expect(code).toContainText('digitalWrite(13, HIGH);');
  });

  test('translates blocks and keeps the program when the language changes', async ({
    launchApp,
  }) => {
    const { window } = await launchApp();
    await window.getByTestId('view-split').click();
    await openCategory(window, 'Outputs');
    await dragIntoLoop(window, 'LED on pin', 'repeat forever');
    await expect(window.getByTestId('generated-code')).toContainText('digitalWrite(13, HIGH);');

    await window.getByTestId('open-settings').click();
    await window.getByTestId('language-select').selectOption('es');
    await window.getByTestId('settings-close').click();

    await expect(window.locator('.blocklyText', { hasText: 'repetir para siempre' })).toBeVisible();
    await expect(window.getByTestId('generated-code')).toContainText('digitalWrite(13, HIGH);');
  });

  test('shows advanced categories on request', async ({ launchApp }) => {
    const { window } = await launchApp();
    const pins = window.locator('.blocklyToolboxCategory', { hasText: 'Pins' });
    await expect(pins).toHaveCount(0);
    await window.getByTestId('toggle-block-level').click();
    await expect(pins).toBeVisible();
  });
});
