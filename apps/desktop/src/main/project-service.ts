import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import {
  BLOCKS_FILE,
  CIRCUIT_FILE,
  MANIFEST_FILE,
  ProjectFormatError,
  filesToProject,
  importSketch,
  inoFileName,
  projectDocumentSchema,
  projectToFiles,
  toSketchName,
  type ProjectDocument,
} from '@ideblock/project';
import type { ExampleSummary, OpenedProject, ProjectResult, RecentProject } from '@ideblock/shared';
import { z } from 'zod';

const MAX_RECENT = 10;

const recentSchema = z.array(z.object({ path: z.string(), name: z.string() }));
const sessionSchema = z.object({
  project: projectDocumentSchema,
  path: z.string().nullable(),
});

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function writeAtomically(path: string, content: string): Promise<void> {
  const temp = `${path}.tmp`;
  await writeFile(temp, content, 'utf8');
  await rename(temp, path);
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}

function failure<T>(error: unknown): ProjectResult<T> {
  if (error instanceof ProjectFormatError) return { ok: false, reason: error.reason };
  return { ok: false, reason: 'not-found' };
}

/** Reads and writes projects on disk. Pure file logic, no dialogs. */
export class ProjectService {
  constructor(
    private readonly userDataDir: string,
    private readonly examplesDir: string,
  ) {}

  /** Accepts the project folder, its ideblock.json or any .ino file. */
  async openPath(path: string): Promise<ProjectResult<OpenedProject>> {
    try {
      const info = await stat(path);
      const folder = info.isDirectory() ? path : dirname(path);
      const folderName = basename(folder);

      if (
        !info.isDirectory() &&
        extname(path) === '.ino' &&
        basename(path, '.ino') !== folderName
      ) {
        // A loose sketch whose name does not match its folder is imported as code.
        const code = await readFile(path, 'utf8');
        return {
          ok: true,
          value: { project: importSketch(code, basename(path, '.ino')), path: null },
        };
      }

      const project = await this.readFolder(folder);
      await this.addRecent({ path: folder, name: project.manifest.name });
      return { ok: true, value: { project, path: folder } };
    } catch (error) {
      return failure(error);
    }
  }

  async save(project: ProjectDocument, folder: string): Promise<ProjectResult<string>> {
    try {
      await mkdir(folder, { recursive: true });
      const files = projectToFiles(project, basename(folder));
      for (const [file, content] of Object.entries(files)) {
        await writeAtomically(join(folder, file), content);
      }
      await this.addRecent({ path: folder, name: project.manifest.name });
      return { ok: true, value: folder };
    } catch {
      return { ok: false, reason: 'write-failed' };
    }
  }

  /** The chosen path names the new folder; its name is made valid for a sketch. */
  folderForSave(chosenPath: string): string {
    const name = toSketchName(basename(chosenPath, extname(chosenPath)));
    return join(dirname(chosenPath), name);
  }

  async exportSketch(code: string, path: string): Promise<ProjectResult<string>> {
    try {
      const target = extname(path) === '.ino' ? path : `${path}.ino`;
      await writeAtomically(target, code);
      return { ok: true, value: target };
    } catch {
      return { ok: false, reason: 'write-failed' };
    }
  }

  async listExamples(): Promise<ExampleSummary[]> {
    const entries = await readdir(this.examplesDir, { withFileTypes: true }).catch(() => []);
    const summaries: ExampleSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const result = await this.openFolder(join(this.examplesDir, entry.name));
      const example = result?.manifest.example;
      if (!example) continue;
      summaries.push({
        id: entry.name,
        title: example.title,
        description: example.description,
        level: example.level,
        order: example.order ?? 0,
      });
    }
    return summaries.sort((a, b) => a.level - b.level || a.order - b.order);
  }

  async loadExample(id: string): Promise<ProjectResult<ProjectDocument>> {
    const examples = await this.listExamples();
    // Only known ids are accepted, which also rules out path traversal.
    if (!examples.some((example) => example.id === id)) return { ok: false, reason: 'not-found' };
    const project = await this.openFolder(join(this.examplesDir, id));
    return project ? { ok: true, value: project } : { ok: false, reason: 'not-found' };
  }

  async recent(): Promise<RecentProject[]> {
    const list = await this.readRecent();
    const available: RecentProject[] = [];
    for (const entry of list) {
      if (await exists(entry.path)) available.push(entry);
    }
    return available;
  }

  async loadSession(): Promise<OpenedProject | null> {
    const content = await readOptional(this.sessionFile);
    if (content === undefined) return null;
    try {
      const parsed = sessionSchema.safeParse(JSON.parse(content));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  async saveSession(session: OpenedProject): Promise<void> {
    const parsed = sessionSchema.parse(session);
    await mkdir(this.userDataDir, { recursive: true });
    await writeAtomically(this.sessionFile, JSON.stringify(parsed));
  }

  private get sessionFile(): string {
    return join(this.userDataDir, 'session.json');
  }

  private get recentFile(): string {
    return join(this.userDataDir, 'recent.json');
  }

  private async readFolder(folder: string): Promise<ProjectDocument> {
    const folderName = basename(folder);
    const files: Record<string, string> = {};
    for (const file of [MANIFEST_FILE, BLOCKS_FILE, CIRCUIT_FILE, inoFileName(folderName)]) {
      const content = await readOptional(join(folder, file));
      if (content !== undefined) files[file] = content;
    }
    return filesToProject(files, folderName);
  }

  private async openFolder(folder: string): Promise<ProjectDocument | null> {
    try {
      return await this.readFolder(folder);
    } catch {
      return null;
    }
  }

  private async readRecent(): Promise<RecentProject[]> {
    const content = await readOptional(this.recentFile);
    if (content === undefined) return [];
    try {
      const parsed = recentSchema.safeParse(JSON.parse(content));
      return parsed.success ? parsed.data : [];
    } catch {
      return [];
    }
  }

  private async addRecent(entry: RecentProject): Promise<void> {
    const list = (await this.readRecent()).filter((item) => item.path !== entry.path);
    list.unshift(entry);
    await mkdir(this.userDataDir, { recursive: true });
    await writeAtomically(this.recentFile, JSON.stringify(list.slice(0, MAX_RECENT), null, 2));
  }
}
