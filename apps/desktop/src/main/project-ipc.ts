import { join } from 'node:path';
import { projectDocumentSchema, toSketchName } from '@ideblock/project';
import type { DialogTexts } from '@ideblock/shared';
import { app, BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import type { InvokeHandlers } from './ipc';
import type { ProjectService } from './project-service';

const dialogTextsSchema = z.object({ title: z.string(), filterName: z.string() });

function ownerWindow(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined;
}

function documentsFolder(): string {
  return join(app.getPath('documents'), 'IdeBlock');
}

export function examplesDirectory(): string {
  // Packaged builds ship the examples as an extra resource next to the app.
  return app.isPackaged
    ? join(process.resourcesPath, 'examples')
    : join(app.getAppPath(), '..', '..', 'examples');
}

type ProjectHandlers = Pick<
  InvokeHandlers,
  | 'project:open'
  | 'project:open-path'
  | 'project:save'
  | 'project:save-as'
  | 'project:export-sketch'
  | 'project:examples'
  | 'project:load-example'
  | 'project:recent'
  | 'session:load'
  | 'session:save'
>;

export function projectHandlers(service: ProjectService): ProjectHandlers {
  return {
    'project:open': async (event, texts) => {
      const { title, filterName } = dialogTextsSchema.parse(texts) satisfies DialogTexts;
      const window = ownerWindow(event);
      const options = {
        title,
        defaultPath: documentsFolder(),
        properties: ['openFile' as const],
        filters: [{ name: filterName, extensions: ['json', 'ino'] }],
      };
      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options);
      const [path] = result.filePaths;
      if (result.canceled || !path) return null;
      return service.openPath(path);
    },
    'project:open-path': (_event, path) => service.openPath(z.string().parse(path)),
    'project:save': (_event, project, path) =>
      service.save(projectDocumentSchema.parse(project), z.string().parse(path)),
    'project:save-as': async (event, project, texts) => {
      const document = projectDocumentSchema.parse(project);
      const { title } = dialogTextsSchema.parse(texts);
      const window = ownerWindow(event);
      const options = {
        title,
        defaultPath: join(documentsFolder(), toSketchName(document.manifest.name)),
        properties: ['createDirectory' as const, 'showOverwriteConfirmation' as const],
      };
      const result = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) return null;
      return service.save(document, service.folderForSave(result.filePath));
    },
    'project:export-sketch': async (event, code, name, texts) => {
      const { title, filterName } = dialogTextsSchema.parse(texts);
      const window = ownerWindow(event);
      const options = {
        title,
        defaultPath: join(app.getPath('documents'), `${toSketchName(z.string().parse(name))}.ino`),
        filters: [{ name: filterName, extensions: ['ino'] }],
      };
      const result = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) return null;
      return service.exportSketch(z.string().parse(code), result.filePath);
    },
    'project:examples': () => service.listExamples(),
    'project:load-example': (_event, id) => service.loadExample(z.string().parse(id)),
    'project:recent': () => service.recent(),
    'session:load': () => service.loadSession(),
    'session:save': (_event, session) => service.saveSession(session),
  };
}
