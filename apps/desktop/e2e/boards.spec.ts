import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, menu, test } from './fixtures';

test.describe('boards and libraries', () => {
  test('lists the boards and moves an offline pack', async ({ launchApp, userDataDir }) => {
    test.setTimeout(120_000);
    const { app, window } = await launchApp();
    await menu(window, 'file', 'boards');
    const dialog = window.getByTestId('boards-dialog');
    await expect(dialog).toBeVisible();
    // Works without internet too: the cores are listed either way.
    await expect(dialog.getByTestId('core-arduino:avr')).toContainText('Arduino Uno', {
      timeout: 60_000,
    });
    await expect(dialog.getByTestId('boards-libraries')).toContainText('Servo');

    const target = join(userDataDir, 'usb');
    await mkdir(target);
    await app.evaluate(({ dialog: native }, folder) => {
      native.showOpenDialog = (async () => ({ canceled: false, filePaths: [folder] })) as never;
    }, target);
    await dialog.getByTestId('boards-export').click();
    await expect(dialog.getByTestId('boards-message')).toContainText('pack was saved', {
      timeout: 60_000,
    });
    const manifest = JSON.parse(
      await readFile(
        join(target, `ideblock-pack-${process.platform}-${process.arch}`, 'ideblock-pack.json'),
        'utf8',
      ),
    ) as { platform: string };
    expect(manifest.platform).toBe(process.platform);

    // The folder holding the pack is accepted as well as the pack itself.
    await dialog.getByTestId('boards-import').click();
    await expect(dialog.getByTestId('boards-message')).toContainText(
      'boards and libraries in the pack',
    );

    const empty = join(userDataDir, 'empty');
    await mkdir(empty);
    await app.evaluate(({ dialog: native }, folder) => {
      native.showOpenDialog = (async () => ({ canceled: false, filePaths: [folder] })) as never;
    }, empty);
    await dialog.getByTestId('boards-import').click();
    await expect(dialog.getByTestId('boards-message')).toContainText('no IdeBlock pack');
  });
});
