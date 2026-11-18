import { expect, test } from './fixtures';

test.describe('separate simulator window', () => {
  test('moves the simulator to its own window and back', async ({ launchApp }) => {
    const { app, window } = await launchApp('es-AR');
    const blocks = window.getByTestId('panel-blocks');
    const widthBefore = (await blocks.boundingBox())!.width;

    const opened = app.waitForEvent('window');
    await window.getByTestId('simulator-detach').click();
    const simulatorWindow = await opened;
    await expect(simulatorWindow.getByTestId('detached-simulator')).toBeVisible();

    // The main window gives the freed space to the editors.
    await expect(window.getByTestId('panel-simulator')).toHaveCount(0);
    await expect.poll(async () => (await blocks.boundingBox())!.width).toBeGreaterThan(widthBefore);

    // Changes made in the separate window reach the project in the main window.
    await simulatorWindow.getByTestId('simulator-add').click();
    await simulatorWindow.getByTestId('add-led').click();
    await expect(simulatorWindow.getByTestId('component-led1')).toBeVisible();

    const closed = simulatorWindow.waitForEvent('close');
    await simulatorWindow.getByTestId('simulator-attach').click();
    await closed;
    await expect(window.getByTestId('panel-simulator')).toBeVisible();
    await expect(window.getByTestId('component-led1')).toBeVisible();
  });
});
