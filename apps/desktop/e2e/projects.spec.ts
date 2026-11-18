import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ElectronApplication } from '@playwright/test';
import { editorText, expect, menu, test } from './fixtures';

/** Answers the next native save dialog with `filePath`. */
async function answerSaveDialog(app: ElectronApplication, filePath: string): Promise<void> {
  await app.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: target })) as never;
  }, filePath);
}

async function answerOpenDialog(app: ElectronApplication, filePath: string): Promise<void> {
  await app.evaluate(({ dialog }, target) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [target] })) as never;
  }, filePath);
}

test.describe('projects', () => {
  test('opens an example and saves it as a sketch folder', async ({ launchApp, userDataDir }) => {
    const { app, window } = await launchApp('es-AR');
    await window.getByTestId('file-examples').click();
    await window.getByTestId('example-TrafficLight').click();
    await expect(window.getByTestId('project-name')).toHaveValue('Semáforo');

    const target = join(userDataDir, 'projects', 'Mi semáforo');
    await answerSaveDialog(app, target);
    await window.getByTestId('file-save').click();

    const folder = join(userDataDir, 'projects', 'Mi_semaforo');
    await expect(window.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');
    expect((await readdir(folder)).sort()).toEqual([
      'Mi_semaforo.ino',
      'blocks.json',
      'circuit.json',
      'ideblock.json',
    ]);
    expect(await readFile(join(folder, 'Mi_semaforo.ino'), 'utf8')).toContain(
      'digitalWrite(10, HIGH);',
    );

    await window.getByTestId('project-name').fill('Semáforo de la escuela');
    await expect
      .poll(async () => JSON.parse(await readFile(join(folder, 'ideblock.json'), 'utf8')).name)
      .toBe('Semáforo de la escuela');
  });

  test('reopens a saved project', async ({ launchApp, userDataDir }) => {
    const first = await launchApp();
    await first.window.getByTestId('file-examples').click();
    await first.window.getByTestId('example-Blink').click();
    await answerSaveDialog(first.app, join(userDataDir, 'Blink'));
    await first.window.getByTestId('file-save').click();
    await expect(first.window.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');

    await menu(first.window, 'file', 'new');
    await expect(first.window.getByTestId('project-name')).toHaveValue('My project');

    await answerOpenDialog(first.app, join(userDataDir, 'Blink', 'ideblock.json'));
    await menu(first.window, 'file', 'open');
    await expect(first.window.getByTestId('project-name')).toHaveValue('Blinking LED');
    await expect.poll(() => editorText(first.window)).toContain('digitalWrite(13, HIGH);');
  });

  test('restores an unsaved project after a restart', async ({ launchApp }) => {
    const first = await launchApp();
    await first.window.getByTestId('project-name').fill('Robot');
    await expect.poll(() => first.window.getByTestId('project-name').inputValue()).toBe('Robot');
    // Leave time for the session to be written.
    await first.window.waitForTimeout(1500);
    await first.app.close();

    const second = await launchApp();
    await expect(second.window.getByTestId('project-name')).toHaveValue('Robot');
  });

  test('asks before replacing an edited project that is not in a folder', async ({ launchApp }) => {
    const { window } = await launchApp();
    await window.getByTestId('project-name').fill('Draft');
    await menu(window, 'file', 'new');

    await expect(window.getByTestId('confirm-replace-dialog')).toBeVisible();
    await window.getByTestId('confirm-discard').click();
    await expect(window.getByTestId('project-name')).toHaveValue('My project');
  });

  test('exports a standard sketch file', async ({ launchApp, userDataDir }) => {
    const { app, window } = await launchApp();
    await window.getByTestId('file-examples').click();
    await window.getByTestId('example-ButtonLed').click();
    await answerSaveDialog(app, join(userDataDir, 'button'));
    await menu(window, 'file', 'export');

    await expect
      .poll(() => readFile(join(userDataDir, 'button.ino'), 'utf8').catch(() => ''))
      .toContain('pinMode(2, INPUT_PULLUP);');
  });
});
