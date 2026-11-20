import { access, cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ALL_BLOCK_LIBRARIES, BOARD_CORES } from '@ideblock/boards';
import type {
  BoardsResult,
  BoardsStatus,
  CoreStatus,
  LibraryStatus,
  OfflinePack,
  ToolchainProgress,
} from '@ideblock/shared';
import type { ArduinoCli } from './arduino-cli';

export const PACK_MANIFEST = 'ideblock-pack.json';
/** Remembers the pack an offline installer brought, so it is imported only once. */
const BUNDLED_MARKER = 'bundled-pack.json';

interface CoreListResponse {
  platforms?: { id: string; installed_version?: string; latest_version?: string }[];
}

interface LibListResponse {
  installed_libraries?: { library: { name: string; version?: string } }[];
}

/** What a pack copies from the data folder; tmp holds leftovers and inventory.yaml an installation id. */
const PACK_DATA_EXCLUDED = new Set(['tmp', 'inventory.yaml']);

export interface BoardManagerOptions {
  cli: ArduinoCli;
  /** The folder arduino-cli keeps its data, downloads and libraries in. */
  dataRoot: string;
  /** Runs a task alone, in the same queue as compiling and uploading. */
  exclusive: <T>(task: () => Promise<T>) => Promise<T>;
  onProgress: (progress: ToolchainProgress) => void;
  /** Called after cores or libraries changed, so cached builds are not reused. */
  onChanged: () => void;
  platform?: string;
  arch?: string;
}

/** Lists, installs and removes board packages and libraries, and moves them in offline packs. */
export class BoardManager {
  private readonly platform: string;
  private readonly arch: string;
  /** The package indexes were refreshed in this session. */
  private indexFresh = false;

  constructor(private readonly options: BoardManagerOptions) {
    this.platform = options.platform ?? process.platform;
    this.arch = options.arch ?? process.arch;
  }

  status(): Promise<BoardsStatus> {
    return this.options.exclusive(async () => {
      if (!(await this.hasTool()))
        return { cores: this.unknownCores(), libraries: [], online: false };
      // Refreshing the indexes needs internet; the copies on disk still answer without it.
      const online = await this.refreshIndex();
      const installed = await this.options.cli.json<CoreListResponse>(['core', 'list']);
      const cores: CoreStatus[] = [];
      for (const { id, boards } of BOARD_CORES) {
        const platform = installed.platforms?.find((item) => item.id === id);
        let latest = platform?.latest_version ?? null;
        if (!latest) {
          const search = await this.options.cli
            .json<CoreListResponse>(['core', 'search', id])
            .catch(() => ({}) as CoreListResponse);
          latest = search.platforms?.find((item) => item.id === id)?.latest_version ?? null;
        }
        cores.push({
          id,
          boards: boards.map((board) => board.id),
          installed: platform?.installed_version ?? null,
          latest,
        });
      }
      return { cores, libraries: await this.libraries(), online };
    });
  }

  installCore(id: string): Promise<BoardsResult> {
    return this.change(async () => {
      if (!BOARD_CORES.some((core) => core.id === id)) return { ok: false, failure: 'failed' };
      await this.refreshIndex();
      return this.run(['core', 'install', id], 'core', id);
    });
  }

  removeCore(id: string): Promise<BoardsResult> {
    return this.change(async () => {
      if (!BOARD_CORES.some((core) => core.id === id)) return { ok: false, failure: 'failed' };
      return this.run(['core', 'uninstall', id], 'remove', id);
    });
  }

  installLibraries(): Promise<BoardsResult> {
    return this.change(async () => {
      const index = await this.options.cli.run(['lib', 'update-index']);
      if (index.code !== 0) return { ok: false, failure: 'failed', detail: index.stderr };
      for (const name of ALL_BLOCK_LIBRARIES) {
        const result = await this.run(['lib', 'install', name], 'library', name);
        if (!result.ok) return result;
      }
      return { ok: true };
    });
  }

  /** Copies the installed cores and libraries to a folder, to install elsewhere without internet. */
  exportPack(target: string): Promise<BoardsResult> {
    return this.options.exclusive(async () => {
      if (!(await this.hasTool())) return { ok: false, failure: 'tool-missing' };
      const installed = await this.options.cli.json<CoreListResponse>(['core', 'list']);
      const manifest: OfflinePack = {
        formatVersion: 1,
        platform: this.platform,
        arch: this.arch,
        created: new Date().toISOString(),
        cores: (installed.platforms ?? []).flatMap((item) =>
          item.installed_version ? [{ id: item.id, version: item.installed_version }] : [],
        ),
        libraries: (await this.libraries()).flatMap((item) =>
          item.installed ? [{ name: item.name, version: item.installed }] : [],
        ),
      };
      try {
        await mkdir(target, { recursive: true });
        const data = join(this.options.dataRoot, 'data');
        for (const entry of await readdir(data)) {
          if (PACK_DATA_EXCLUDED.has(entry)) continue;
          this.options.onProgress({ stage: 'pack-export', subject: entry, detail: '' });
          await cp(join(data, entry), join(target, 'data', entry), { recursive: true });
        }
        const libraries = join(this.options.dataRoot, 'user', 'libraries');
        if (await exists(libraries)) {
          this.options.onProgress({ stage: 'pack-export', subject: 'libraries', detail: '' });
          await cp(libraries, join(target, 'user', 'libraries'), { recursive: true });
        }
        // Written last, so a copy that stopped half way is not taken for a pack.
        await writeFile(join(target, PACK_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
        return { ok: true };
      } catch (error) {
        return { ok: false, failure: 'failed', detail: String(error) };
      }
    });
  }

  /** Installs the cores and libraries of an offline pack folder. */
  importPack(source: string): Promise<BoardsResult> {
    return this.change(async () => {
      const manifest = await readPack(source);
      if (!manifest) return { ok: false, failure: 'not-a-pack' };
      if (manifest.platform !== this.platform || manifest.arch !== this.arch) {
        return {
          ok: false,
          failure: 'wrong-platform',
          detail: `${manifest.platform}-${manifest.arch}`,
        };
      }
      try {
        const data = join(source, 'data');
        for (const entry of await readdir(data)) {
          if (PACK_DATA_EXCLUDED.has(entry)) continue;
          this.options.onProgress({ stage: 'pack-import', subject: entry, detail: '' });
          await cp(join(data, entry), join(this.options.dataRoot, 'data', entry), {
            recursive: true,
            force: true,
          });
        }
        const libraries = join(source, 'user', 'libraries');
        if (await exists(libraries)) {
          this.options.onProgress({ stage: 'pack-import', subject: 'libraries', detail: '' });
          await cp(libraries, join(this.options.dataRoot, 'user', 'libraries'), {
            recursive: true,
            force: true,
          });
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, failure: 'failed', detail: String(error) };
      }
    });
  }

  /** Downloads the package indexes once per session; false without internet. */
  private async refreshIndex(): Promise<boolean> {
    if (this.indexFresh) return true;
    const index = await this.options.cli.run(['core', 'update-index']);
    this.indexFresh = index.code === 0;
    return this.indexFresh;
  }

  /**
   * Imports the pack shipped next to the application by an offline installer,
   * once: a marker remembers which pack was imported.
   */
  async importBundled(source: string): Promise<BoardsResult | null> {
    const manifest = await readPack(source);
    if (!manifest) return null;
    const marker = join(this.options.dataRoot, BUNDLED_MARKER);
    const imported = await readFile(marker, 'utf8')
      .then((text) => (JSON.parse(text) as { created?: string }).created)
      .catch(() => undefined);
    if (imported === manifest.created) return null;
    const result = await this.importPack(source);
    if (result.ok) {
      await mkdir(this.options.dataRoot, { recursive: true });
      await writeFile(marker, `${JSON.stringify({ created: manifest.created })}\n`);
    }
    return result;
  }

  private change(task: () => Promise<BoardsResult>): Promise<BoardsResult> {
    return this.options.exclusive(async () => {
      if (!(await this.hasTool())) return { ok: false, failure: 'tool-missing' };
      const result = await task();
      this.options.onChanged();
      return result;
    });
  }

  private async run(
    args: string[],
    stage: ToolchainProgress['stage'],
    subject: string,
  ): Promise<BoardsResult> {
    this.options.onProgress({ stage, subject, detail: '' });
    const result = await this.options.cli.run(args, (detail) =>
      this.options.onProgress({ stage, subject, detail }),
    );
    return result.code === 0
      ? { ok: true }
      : { ok: false, failure: 'failed', detail: result.stderr || result.stdout };
  }

  private async libraries(): Promise<LibraryStatus[]> {
    const response = await this.options.cli
      .json<LibListResponse>(['lib', 'list'])
      .catch(() => ({}) as LibListResponse);
    return ALL_BLOCK_LIBRARIES.map((name) => ({
      name,
      installed:
        response.installed_libraries?.find((entry) => entry.library.name === name)?.library
          .version ?? null,
    }));
  }

  private unknownCores(): CoreStatus[] {
    return BOARD_CORES.map(({ id, boards }) => ({
      id,
      boards: boards.map((board) => board.id),
      installed: null,
      latest: null,
    }));
  }

  private hasTool(): Promise<boolean> {
    return exists(this.options.cli.binary);
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** The manifest of an offline pack folder, or null when the folder is not one. */
export async function readPack(folder: string): Promise<OfflinePack | null> {
  try {
    const manifest = JSON.parse(await readFile(join(folder, PACK_MANIFEST), 'utf8')) as unknown;
    if (typeof manifest !== 'object' || manifest === null) return null;
    const pack = manifest as Partial<OfflinePack>;
    if (
      pack.formatVersion !== 1 ||
      typeof pack.platform !== 'string' ||
      typeof pack.arch !== 'string' ||
      !Array.isArray(pack.cores) ||
      !Array.isArray(pack.libraries)
    ) {
      return null;
    }
    return pack as OfflinePack;
  } catch {
    return null;
  }
}
