import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { DialogTexts } from '@ideblock/shared';
import { app, BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import type { InvokeHandlers } from './ipc';
import { readPack, type BoardManager } from './toolchain/board-manager';

const dialogTextsSchema = z.object({ title: z.string(), filterName: z.string() });
const coreIdSchema = z.string().regex(/^[\w.-]+:[\w.-]+$/);

type BoardsHandlers = Pick<
  InvokeHandlers,
  | 'boards:status'
  | 'boards:install-core'
  | 'boards:remove-core'
  | 'boards:install-libraries'
  | 'boards:export-pack'
  | 'boards:import-pack'
>;

async function chooseFolder(
  event: IpcMainInvokeEvent,
  texts: DialogTexts,
  create: boolean,
): Promise<string | null> {
  const { title } = dialogTextsSchema.parse(texts);
  const window = BrowserWindow.fromWebContents(event.sender);
  const options = {
    title,
    defaultPath: app.getPath('documents'),
    properties: [
      'openDirectory' as const,
      ...(create ? (['createDirectory', 'promptToCreate'] as const) : []),
    ],
  };
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);
  const [path] = result.filePaths;
  return result.canceled || !path ? null : path;
}

/** The pack in a folder: the folder itself, or the one pack folder inside it. */
async function findPack(folder: string): Promise<string> {
  if (await readPack(folder)) return folder;
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => []);
  const packs = entries.filter(
    (entry) => entry.isDirectory() && entry.name.startsWith(PACK_FOLDER_PREFIX),
  );
  return packs.length === 1 ? join(folder, packs[0]!.name) : folder;
}

const PACK_FOLDER_PREFIX = 'ideblock-pack-';

export function boardsHandlers(manager: BoardManager): BoardsHandlers {
  return {
    'boards:status': () => manager.status(),
    'boards:install-core': (_event, id) => manager.installCore(coreIdSchema.parse(id)),
    'boards:remove-core': (_event, id) => manager.removeCore(coreIdSchema.parse(id)),
    'boards:install-libraries': () => manager.installLibraries(),
    'boards:export-pack': async (event, texts) => {
      const folder = await chooseFolder(event, texts, true);
      if (!folder) return null;
      return manager.exportPack(
        join(folder, `${PACK_FOLDER_PREFIX}${process.platform}-${process.arch}`),
      );
    },
    'boards:import-pack': async (event, texts) => {
      const folder = await chooseFolder(event, texts, false);
      if (!folder) return null;
      return manager.importPack(await findPack(folder));
    },
  };
}
