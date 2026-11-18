import { expect, menu, test } from './fixtures';

test.describe('workspace layout', () => {
  test('toggles the blocks and code panels independently', async ({ launchApp }) => {
    const { window } = await launchApp();
    const blocks = window.getByTestId('panel-blocks');
    const code = window.getByTestId('panel-code');
    const toggleBlocks = window.getByTestId('toggle-blocks');
    const toggleCode = window.getByTestId('toggle-code');

    await expect(blocks).toBeVisible();
    await expect(code).toBeVisible();

    await toggleCode.click();
    await expect(code).toHaveCount(0);
    await expect(toggleCode).toHaveAttribute('aria-pressed', 'false');

    await toggleBlocks.click();
    await expect(window.getByTestId('workspace-empty')).toBeVisible();

    await window.keyboard.press('Control+2');
    await expect(code).toBeVisible();
    await expect(blocks).toHaveCount(0);
  });

  test('hides and shows the simulator and the console', async ({ launchApp }) => {
    const { window } = await launchApp();
    const simulator = window.getByTestId('panel-simulator');
    const console = window.getByTestId('panel-console');

    await expect(simulator).toBeVisible();
    await window.getByTestId('panel-simulator-close').click();
    await expect(simulator).toHaveCount(0);
    await menu(window, 'view', 'simulator');
    await expect(simulator).toBeVisible();

    await expect(console).toBeVisible();
    await window.getByTestId('panel-console-close').click();
    await expect(console).toHaveCount(0);
    await window.keyboard.press('Control+j');
    await expect(console).toBeVisible();
  });

  test('focuses on the editor', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('editor-focus').click();
    await expect(window.getByTestId('panel-simulator')).toHaveCount(0);
    await expect(window.getByTestId('panel-console')).toHaveCount(0);
    await window.getByTestId('editor-focus').click();
    await expect(window.getByTestId('panel-simulator')).toBeVisible();
  });

  test('hides the serial graph when asked', async ({ launchApp }) => {
    const { window } = await launchApp('es-AR');
    await window.getByTestId('console-tab-serial').click();
    const graph = window.getByTestId('serial-plotter');
    await expect(graph).toBeVisible();
    await window.getByTestId('serial-plot-view').click();
    await expect(graph).toHaveCount(0);
    await expect(window.getByTestId('serial-output')).toBeVisible();
  });

  test('resizes panels with the keyboard and keeps the size', async ({ launchApp }) => {
    const first = await launchApp();
    const splitter = first.window.getByTestId('splitter-simulator');
    await expect(splitter).toHaveAttribute('aria-valuenow', '32');

    await splitter.focus();
    await first.window.keyboard.press('ArrowLeft');
    await first.window.keyboard.press('ArrowLeft');
    await expect(splitter).toHaveAttribute('aria-valuenow', '36');
    await first.app.close();

    const second = await launchApp();
    await expect(second.window.getByTestId('splitter-simulator')).toHaveAttribute(
      'aria-valuenow',
      '36',
    );
  });

  test('resizes panels by dragging', async ({ launchApp }) => {
    const { window } = await launchApp();
    const splitter = window.getByTestId('splitter-editors');
    const box = await splitter.boundingBox();
    if (!box) throw new Error('Splitter not rendered');

    await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await window.mouse.down();
    await window.mouse.move(box.x - 120, box.y + box.height / 2, { steps: 5 });
    await window.mouse.up();

    const value = Number(await splitter.getAttribute('aria-valuenow'));
    expect(value).toBeLessThan(62);
    expect(value).toBeGreaterThanOrEqual(20);
  });
});
