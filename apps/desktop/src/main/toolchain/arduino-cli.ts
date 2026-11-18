import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface ArduinoCliPaths {
  binary: string;
  /** Root for cores, downloads, libraries and the configuration file. */
  dataRoot: string;
}

/** Board package indexes needed beyond the default one. */
export const ADDITIONAL_INDEX_URLS = [
  'https://espressif.github.io/arduino-esp32/package_esp32_index.json',
];

/**
 * The configuration keeps everything inside the app's own folder, so an
 * Arduino IDE installed on the same computer is never affected.
 */
export function configurationYaml(dataRoot: string): string {
  const quote = (path: string) => JSON.stringify(path);
  return [
    'board_manager:',
    '  additional_urls:',
    ...ADDITIONAL_INDEX_URLS.map((url) => `    - ${url}`),
    'directories:',
    `  data: ${quote(join(dataRoot, 'data'))}`,
    `  downloads: ${quote(join(dataRoot, 'staging'))}`,
    `  user: ${quote(join(dataRoot, 'user'))}`,
    'updater:',
    '  enable_notification: false',
    '',
  ].join('\n');
}

/** Thin wrapper that runs arduino-cli with the app configuration. */
export class ArduinoCli {
  private configured: Promise<string> | null = null;

  constructor(private readonly paths: ArduinoCliPaths) {}

  get binary(): string {
    return this.paths.binary;
  }

  run(args: string[], onOutput?: (line: string) => void): Promise<RunResult> {
    return this.configFile().then(
      (config) =>
        new Promise<RunResult>((resolve, reject) => {
          const child = spawn(this.paths.binary, ['--config-file', config, ...args], {
            windowsHide: true,
          });
          let stdout = '';
          let stderr = '';
          const forward = (chunk: Buffer, sink: 'out' | 'err'): void => {
            const text = chunk.toString('utf8');
            if (sink === 'out') stdout += text;
            else stderr += text;
            if (onOutput) {
              // Progress bars redraw with carriage returns; only the latest state matters.
              const lines = text.split(/[\r\n]+/).filter((line) => line.trim() !== '');
              const last = lines.at(-1);
              if (last) onOutput(last.trim());
            }
          };
          child.stdout.on('data', (chunk: Buffer) => forward(chunk, 'out'));
          child.stderr.on('data', (chunk: Buffer) => forward(chunk, 'err'));
          child.on('error', reject);
          child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
        }),
    );
  }

  /** Starts a long-running command, such as the port watcher or serial monitor. */
  async spawn(args: string[]): Promise<ChildProcessWithoutNullStreams> {
    const config = await this.configFile();
    return spawn(this.paths.binary, ['--config-file', config, ...args], { windowsHide: true });
  }

  async json<T>(args: string[]): Promise<T> {
    const result = await this.run([...args, '--json']);
    try {
      return JSON.parse(result.stdout) as T;
    } catch {
      throw new Error(`arduino-cli ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
    }
  }

  private configFile(): Promise<string> {
    this.configured ??= (async () => {
      const path = join(this.paths.dataRoot, 'arduino-cli.yaml');
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, configurationYaml(this.paths.dataRoot), 'utf8');
      return path;
    })();
    return this.configured;
  }
}
