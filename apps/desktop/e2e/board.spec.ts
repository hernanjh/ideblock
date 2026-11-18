import { expect, test } from './fixtures';

test.describe('physical board', () => {
  test('guides the user when no board is connected', async ({ launchApp }) => {
    const { window } = await launchApp('es-AR');
    await expect(window.getByTestId('port-select')).toContainText('No hay placa conectada');

    await window.getByTestId('build-upload').click();
    await expect(window.getByTestId('panel-console')).toBeVisible();
    await expect(window.getByTestId('no-board-help')).toContainText('cable USB');
  });

  test('offers the serial monitor and graph', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('toggle-console').click();
    await window.getByTestId('console-tab-serial').click();

    await expect(window.getByTestId('serial-connect')).toBeDisabled();
    await window.getByTestId('serial-plot-view').click();
    await expect(window.getByTestId('serial-plotter')).toContainText('temp:21.5');
  });
});
