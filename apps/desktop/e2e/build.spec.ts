import { expect, test } from './fixtures';

// Compiling needs the real arduino-cli and an installed AVR core; see
// IDEBLOCK_TOOLCHAIN_TESTS and IDEBLOCK_ARDUINO_DATA_DIR in CONTRIBUTING.md.
test.skip(process.env['IDEBLOCK_TOOLCHAIN_TESTS'] !== '1', 'toolchain tests are disabled');

test.describe('compiling', () => {
  test.setTimeout(300_000);

  test('verifies an example program', async ({ launchApp }) => {
    const { window } = await launchApp('es-AR');
    await window.getByTestId('file-examples').click();
    await window.getByTestId('example-ServoKnob').click();
    await window.getByTestId('build-verify').click();

    await expect(window.getByTestId('build-success')).toBeVisible({ timeout: 240_000 });
    await expect(window.getByTestId('build-success')).toContainText('memoria de programa');
  });

  test('explains errors in hand-written code and jumps to the line', async ({ launchApp }) => {
    const { window } = await launchApp('es-AR');
    const editor = window.locator('[data-testid="code-editor"] .view-lines');
    await editor.click();
    await window.keyboard.type('x');
    await window.getByTestId('switch-to-code').click();
    await editor.click();
    await window.keyboard.press('Control+End');
    await window.keyboard.type('\nint total = contador;');

    await window.getByTestId('build-verify').click();
    const errors = window.getByTestId('build-errors');
    await expect(errors).toBeVisible({ timeout: 240_000 });
    await expect(errors).toContainText('Se usa el nombre "contador" pero nunca se creó');
    await errors.getByRole('button', { name: /Línea 7/ }).click();
    await expect(window.locator('.monaco-editor .squiggly-error')).toHaveCount(1);
  });
});
