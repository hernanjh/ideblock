import { editorText, expect, test } from './fixtures';

test.describe('code editor', () => {
  test('explains that generated code is written by the blocks', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('toggle-blocks').click();
    await window.locator('[data-testid="code-editor"] .view-lines').click();
    await window.keyboard.type('x');

    await expect(window.getByTestId('code-locked-notice')).toBeVisible();
    await expect.poll(() => editorText(window)).toBe('void setup() {\n}\n\nvoid loop() {\n}\n');
  });

  test('switches to hand-written code and back while unchanged', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.locator('[data-testid="code-editor"] .view-lines').click();
    await window.keyboard.type('x');
    await window.getByTestId('switch-to-code').click();

    await expect(window.getByTestId('code-mode-overlay')).toBeVisible();
    await window.getByTestId('switch-to-blocks').click();
    await expect(window.getByTestId('code-mode-overlay')).toHaveCount(0);
  });

  test('keeps edited code and does not offer to discard it', async ({ launchApp }) => {
    const { window } = await launchApp();
    const editor = window.locator('[data-testid="code-editor"] .view-lines');
    await editor.click();
    await window.keyboard.type('x');
    await window.getByTestId('switch-to-code').click();

    await editor.click();
    await window.keyboard.press('Control+End');
    await window.keyboard.type('// my note');
    await expect.poll(() => editorText(window)).toContain('// my note');
    await expect(window.getByTestId('switch-to-blocks')).toHaveCount(0);
  });

  test('converts hand-written code to blocks', async ({ launchApp }) => {
    const { window } = await launchApp();
    const editor = window.locator('[data-testid="code-editor"] .view-lines');
    await editor.click();
    await window.keyboard.type('x');
    await window.getByTestId('switch-to-code').click();

    await editor.click();
    await window.keyboard.press('Control+A');
    await window.keyboard.insertText(
      [
        '#include <EEPROM.h>',
        '',
        'void setup() {',
        '  pinMode(LED_BUILTIN, OUTPUT);',
        '}',
        '',
        'void loop() {',
        '  digitalWrite(LED_BUILTIN, HIGH);',
        '  delay(250);',
        '  digitalWrite(LED_BUILTIN, LOW);',
        '  delay(250);',
        '}',
        '',
      ].join('\n'),
    );
    await window.getByTestId('convert-to-blocks').click();
    await expect(window.getByTestId('conversion-summary')).toContainText('1');
    await window.getByTestId('apply-conversion').click();

    await expect(window.getByTestId('code-mode-overlay')).toHaveCount(0);
    await expect.poll(() => editorText(window)).toContain('digitalWrite(13, HIGH);');
    await expect.poll(() => editorText(window)).toContain('#include <EEPROM.h>');
  });
});
