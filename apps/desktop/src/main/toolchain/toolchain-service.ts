import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getBoard, type BoardDefinition } from '@ideblock/boards';
import { parseCompilerOutput } from '@ideblock/compiler';
import { toSketchName } from '@ideblock/project';
import type {
  CompileRequest,
  CompileResult,
  MemoryUsage,
  ToolchainProgress,
  UploadRequest,
  UploadResult,
} from '@ideblock/shared';
import type { ArduinoCli } from './arduino-cli';

interface CoreListResponse {
  platforms?: { id: string; installed_version?: string }[];
}

interface LibListResponse {
  installed_libraries?: { library: { name: string } }[];
}

interface CompileResponse {
  success: boolean;
  compiler_out?: string;
  compiler_err?: string;
  error?: string;
  builder_result?: {
    build_path?: string;
    executable_sections_size?: { name: string; size: number; max_size: number }[];
  };
}

type ProgressListener = (progress: ToolchainProgress) => void;

const PROGRESS_INTERVAL_MS = 150;
const CACHE_SIZE = 8;

/** Sends at most one progress update per interval to keep the UI responsive. */
function throttle(listener: ProgressListener): ProgressListener {
  let last = 0;
  return (progress) => {
    const now = Date.now();
    if (now - last >= PROGRESS_INTERVAL_MS) {
      last = now;
      listener(progress);
    }
  };
}

function memory(
  sections: { name: string; size: number; max_size: number }[] | undefined,
  name: string,
): MemoryUsage | undefined {
  const section = sections?.find((item) => item.name === name);
  return section ? { used: section.size, max: section.max_size } : undefined;
}

/**
 * Compiles sketches with arduino-cli, installing the board core and the
 * libraries a sketch needs the first time they are used. Operations run one at
 * a time because arduino-cli locks its data folder.
 */
export class ToolchainService {
  private queue: Promise<unknown> = Promise.resolve();
  private indexUpdated = false;
  /** Successful builds by source, so an unchanged program starts at once. */
  private readonly cache = new Map<string, CompileResult>();

  constructor(
    private readonly cli: ArduinoCli,
    private readonly buildRoot: string,
    private readonly onProgress: ProgressListener,
  ) {}

  compile(request: CompileRequest): Promise<CompileResult> {
    return this.enqueue(() => this.compileNow(request));
  }

  /** Compiles and uploads in one step, so the board always gets the current code. */
  upload(request: UploadRequest): Promise<UploadResult> {
    return this.enqueue(async () => {
      const compile = await this.compileNow(request.compile);
      if (!compile.ok || !compile.buildPath) {
        return {
          ok: false,
          failure: compile.failure ?? 'compile',
          compile,
          output: '',
        };
      }
      const board = getBoard(request.compile.boardId);
      this.onProgress({ stage: 'upload', subject: request.port, detail: '' });
      const report = throttle(this.onProgress);
      const result = await this.cli.run(
        [
          'upload',
          '--port',
          request.port,
          '--fqbn',
          board.fqbn,
          '--input-dir',
          compile.buildPath,
          '--discovery-timeout',
          '5s',
        ],
        (detail) => report({ stage: 'upload', subject: request.port, detail }),
      );
      const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
      return result.code === 0
        ? { ok: true, compile, output }
        : { ok: false, failure: 'upload', compile, output };
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private cacheKey(request: CompileRequest): string {
    const board = getBoard(request.boardId);
    return createHash('sha256')
      .update(JSON.stringify([board.fqbn, [...request.libraries].sort(), request.code]))
      .digest('hex');
  }

  private async compileNow(request: CompileRequest): Promise<CompileResult> {
    const key = this.cacheKey(request);
    const cached = this.cache.get(key);
    if (cached) return cached;
    const result = await this.build(request);
    if (result.ok) {
      this.cache.delete(key);
      this.cache.set(key, result);
      // Oldest entries go first; Map keeps insertion order.
      while (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value!);
    }
    return result;
  }

  private async build(request: CompileRequest): Promise<CompileResult> {
    const failed = (failure: CompileResult['failure'], output: string): CompileResult => ({
      ok: false,
      ...(failure ? { failure } : {}),
      diagnostics: [],
      output,
    });

    try {
      await access(this.cli.binary);
    } catch {
      return failed('tool-missing', `arduino-cli not found at ${this.cli.binary}`);
    }

    const board = getBoard(request.boardId);
    try {
      await this.ensureCore(board);
    } catch (error) {
      return failed('core-install', String(error));
    }
    try {
      await this.ensureLibraries(request.libraries);
    } catch (error) {
      return failed('library-install', String(error));
    }

    const sketchName = toSketchName(request.sketchName);
    const sketchDir = join(this.buildRoot, 'sketch', sketchName);
    const buildPath = join(this.buildRoot, 'output', board.id);
    await mkdir(sketchDir, { recursive: true });
    await writeFile(join(sketchDir, `${sketchName}.ino`), request.code, 'utf8');

    this.onProgress({ stage: 'compile', detail: board.name });
    const response = await this.cli.json<CompileResponse>([
      'compile',
      '--fqbn',
      board.fqbn,
      '--build-path',
      buildPath,
      '--warnings',
      'default',
      sketchDir,
    ]);

    const output = [response.compiler_out, response.compiler_err, response.error]
      .filter(Boolean)
      .join('\n');
    const diagnostics = parseCompilerOutput(output, `${sketchName}.ino`);
    const sections = response.builder_result?.executable_sections_size;
    const result: CompileResult = {
      ok: response.success,
      diagnostics,
      output,
      buildPath,
    };
    if (!response.success) result.failure = 'compile';
    const program = memory(sections, 'text');
    const data = memory(sections, 'data');
    if (program) result.program = program;
    if (data) result.data = data;
    if (response.success && board.architecture === 'avr') {
      result.firmware = await readFile(join(buildPath, `${sketchName}.ino.hex`), 'utf8');
    } else if (response.success && board.architecture === 'rp2040') {
      result.firmware = (await readFile(join(buildPath, `${sketchName}.ino.bin`))).toString(
        'base64',
      );
    }
    return result;
  }

  private async updateIndex(): Promise<void> {
    if (this.indexUpdated) return;
    const report = throttle(this.onProgress);
    const result = await this.cli.run(['core', 'update-index'], (detail) =>
      report({ stage: 'index', detail }),
    );
    if (result.code !== 0) throw new Error(result.stderr || result.stdout);
    this.indexUpdated = true;
  }

  private async ensureCore(board: BoardDefinition): Promise<void> {
    const installed = await this.cli.json<CoreListResponse>(['core', 'list']);
    if (installed.platforms?.some((platform) => platform.id === board.core.id)) return;

    await this.updateIndex();
    const report = throttle(this.onProgress);
    const result = await this.cli.run(['core', 'install', board.core.id], (detail) =>
      report({ stage: 'core', subject: board.core.id, detail }),
    );
    if (result.code !== 0) throw new Error(result.stderr || result.stdout);
  }

  private async ensureLibraries(libraries: string[]): Promise<void> {
    if (libraries.length === 0) return;
    const response = await this.cli.json<LibListResponse>(['lib', 'list']);
    const installed = new Set(
      response.installed_libraries?.map((entry) => entry.library.name) ?? [],
    );
    const missing = libraries.filter((name) => !installed.has(name));
    if (missing.length === 0) return;

    const report = throttle(this.onProgress);
    const index = await this.cli.run(['lib', 'update-index']);
    if (index.code !== 0) throw new Error(index.stderr || index.stdout);
    for (const name of missing) {
      const result = await this.cli.run(['lib', 'install', name], (detail) =>
        report({ stage: 'library', subject: name, detail }),
      );
      if (result.code !== 0) throw new Error(result.stderr || result.stdout);
    }
  }
}
