import { expect, test } from './fixtures';

test.describe('workspace layout', () => {
  test('toggles the blocks and code panels independently', async ({ launchApp }) => {
    const { window } = await launchApp();
    const blocks = window.getByTestId('panel-blocks');
    const code = window.getByTestId('panel-code');
    const toggleBlocks = window.getByTestId('toggle-blocks');
    const toggleCode = window.getByTestId('toggle-code');

    await expect(blocks).toBeVisible();
    await expect(code).toHaveCount(0);
    await expect(toggleBlocks).toHaveAttribute('aria-pressed', 'true');

    await toggleCode.click();
    await expect(blocks).toBeVisible();
    await expect(code).toBeVisible();

    await toggleBlocks.click();
    await expect(blocks).toHaveCount(0);
    await expect(code).toBeVisible();

    await window.keyboard.press('Control+1');
    await expect(blocks).toBeVisible();
    await window.getByTestId('panel-code-close').click();
    await expect(code).toHaveCount(0);
    await expect(toggleCode).toHaveAttribute('aria-pressed', 'false');
  });

  test('gives the simulator the full width when both editors are hidden', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('toggle-blocks').click();
    await expect(window.getByTestId('splitter-simulator')).toHaveCount(0);
    const simulator = await window.getByTestId('panel-simulator').boundingBox();
    const workspace = await window.getByTestId('workspace').boundingBox();
    expect(simulator!.width).toBeGreaterThan(workspace!.width * 0.9);

    await window.getByTestId('toggle-simulator').click();
    await expect(window.getByTestId('workspace-empty')).toBeVisible();
  });

  test('opens and closes the simulator and console', async ({ launchApp }) => {
    const { window } = await launchApp();
    const simulator = window.getByTestId('panel-simulator');
    const console = window.getByTestId('panel-console');
    const toggleSimulator = window.getByTestId('toggle-simulator');

    await expect(simulator).toBeVisible();
    await expect(toggleSimulator).toHaveAttribute('aria-pressed', 'true');
    await window.getByTestId('panel-simulator-close').click();
    await expect(simulator).toHaveCount(0);
    await expect(toggleSimulator).toHaveAttribute('aria-pressed', 'false');
    await toggleSimulator.click();
    await expect(simulator).toBeVisible();

    await expect(console).toHaveCount(0);
    await window.keyboard.press('Control+j');
    await expect(console).toBeVisible();
    await window.getByTestId('toggle-console').click();
    await expect(console).toHaveCount(0);
  });

  test('resizes panels with the keyboard and keeps the size', async ({ launchApp }) => {
    const first = await launchApp();
    const { window } = first;
    const splitter = window.getByTestId('splitter-simulator');
    await expect(splitter).toHaveAttribute('aria-valuenow', '35');

    await splitter.focus();
    await window.keyboard.press('ArrowLeft');
    await window.keyboard.press('ArrowLeft');
    await expect(splitter).toHaveAttribute('aria-valuenow', '39');
    await first.app.close();

    const second = await launchApp();
    await expect(second.window.getByTestId('splitter-simulator')).toHaveAttribute(
      'aria-valuenow',
      '39',
    );
  });

  test('resizes panels by dragging', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('toggle-code').click();
    const splitter = window.getByTestId('splitter-editors');
    const box = await splitter.boundingBox();
    if (!box) throw new Error('Splitter not rendered');

    await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await window.mouse.down();
    await window.mouse.move(box.x - 120, box.y + box.height / 2, { steps: 5 });
    await window.mouse.up();

    const value = Number(await splitter.getAttribute('aria-valuenow'));
    expect(value).toBeLessThan(50);
    expect(value).toBeGreaterThanOrEqual(20);
  });
});
