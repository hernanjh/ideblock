import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ArduinoCli, RunResult } from '../src/main/toolchain/arduino-cli';
import { BoardManager, PACK_MANIFEST, readPack } from '../src/main/toolchain/board-manager';

let root: string;

/** Answers arduino-cli commands from canned JSON, recording what was run. */
function fakeCli(binary: string, answers: Record<string, unknown>, calls: string[][]): ArduinoCli {
  const run = (args: string[]): Promise<RunResult> => {
    calls.push(args);
    const key = args.filter((arg) => arg !== '--json').join(' ');
    const answer = answers[key];
    return Promise.resolve({
      code: answer === 'fail' ? 1 : 0,
      stdout: answer === undefined || answer === 'fail' ? '' : JSON.stringify(answer),
      stderr: answer === 'fail' ? 'no internet' : '',
    });
  };
  return {
    binary,
    run,
    json: async (args: string[]) => JSON.parse((await run([...args, '--json'])).stdout || '{}'),
  } as unknown as ArduinoCli;
}

function manager(
  answers: Record<string, unknown>,
  calls: string[][] = [],
  platform = 'linux',
  dataRoot = join(root, 'arduino'),
): BoardManager {
  return new BoardManager({
    cli: fakeCli(join(root, 'arduino-cli'), answers, calls),
    dataRoot,
    exclusive: (task) => task(),
    onProgress: () => undefined,
    onChanged: () => undefined,
    platform,
    arch: 'x64',
  });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ideblock-boards-'));
  await writeFile(join(root, 'arduino-cli'), '');
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('BoardManager', () => {
  it('lists the supported cores with installed and latest versions', async () => {
    const status = await manager({
      'core update-index': 'fail',
      'core list': {
        platforms: [{ id: 'arduino:avr', installed_version: '1.8.6', latest_version: '1.8.8' }],
      },
      'core search esp32:esp32': { platforms: [{ id: 'esp32:esp32', latest_version: '3.3.0' }] },
      'lib list': { installed_libraries: [{ library: { name: 'Servo', version: '1.2.2' } }] },
    }).status();

    expect(status.online).toBe(false);
    expect(status.cores.find((core) => core.id === 'arduino:avr')).toMatchObject({
      installed: '1.8.6',
      latest: '1.8.8',
    });
    expect(status.cores.find((core) => core.id === 'arduino:avr')?.boards).toContain('uno');
    expect(status.cores.find((core) => core.id === 'esp32:esp32')).toMatchObject({
      installed: null,
      latest: '3.3.0',
    });
    expect(status.libraries.find((library) => library.name === 'Servo')?.installed).toBe('1.2.2');
    expect(status.libraries.find((library) => library.name === 'ESP32Servo')?.installed).toBe(null);
  });

  it('only installs and removes supported cores', async () => {
    const calls: string[][] = [];
    const boards = manager({}, calls);
    expect(await boards.installCore('arduino:avr')).toEqual({ ok: true });
    expect(await boards.installCore('someone:else')).toMatchObject({ ok: false });
    expect(await boards.removeCore('arduino:avr')).toEqual({ ok: true });
    expect(calls).toContainEqual(['core', 'install', 'arduino:avr']);
    expect(calls).toContainEqual(['core', 'uninstall', 'arduino:avr']);
    expect(calls.flat()).not.toContain('someone:else');
  });

  it('exports an offline pack and imports it on another computer', async () => {
    const data = join(root, 'arduino', 'data');
    await mkdir(join(data, 'packages', 'arduino'), { recursive: true });
    await mkdir(join(data, 'tmp'), { recursive: true });
    await writeFile(join(data, 'package_index.json'), '{}');
    await writeFile(join(data, 'inventory.yaml'), 'installation: secret');
    await writeFile(join(data, 'packages', 'arduino', 'core.txt'), 'avr');
    await mkdir(join(root, 'arduino', 'user', 'libraries', 'Servo'), { recursive: true });
    await writeFile(join(root, 'arduino', 'user', 'libraries', 'Servo', 'Servo.h'), '//');
    const answers = {
      'core list': { platforms: [{ id: 'arduino:avr', installed_version: '1.8.8' }] },
      'lib list': { installed_libraries: [{ library: { name: 'Servo', version: '1.2.2' } }] },
    };

    const pack = join(root, 'pack');
    expect(await manager(answers).exportPack(pack)).toEqual({ ok: true });
    const manifest = await readPack(pack);
    expect(manifest).toMatchObject({
      platform: 'linux',
      arch: 'x64',
      cores: [{ id: 'arduino:avr', version: '1.8.8' }],
      libraries: [{ name: 'Servo', version: '1.2.2' }],
    });
    // The installation id and leftovers stay behind.
    await expect(readFile(join(pack, 'data', 'inventory.yaml'))).rejects.toThrow();
    await expect(readFile(join(pack, 'data', 'tmp'))).rejects.toThrow();

    const other = join(root, 'other');
    expect(await manager({}, [], 'linux', other).importPack(pack)).toEqual({ ok: true });
    expect(await readFile(join(other, 'data', 'packages', 'arduino', 'core.txt'), 'utf8')).toBe(
      'avr',
    );
    expect(await readFile(join(other, 'user', 'libraries', 'Servo', 'Servo.h'), 'utf8')).toBe('//');
  });

  it('refuses a pack from another system or a folder that is not a pack', async () => {
    const pack = join(root, 'pack');
    await mkdir(join(pack, 'data'), { recursive: true });
    expect(await manager({}).importPack(pack)).toEqual({ ok: false, failure: 'not-a-pack' });

    await writeFile(
      join(pack, PACK_MANIFEST),
      JSON.stringify({
        formatVersion: 1,
        platform: 'win32',
        arch: 'x64',
        created: '',
        cores: [],
        libraries: [],
      }),
    );
    expect(await manager({}).importPack(pack)).toMatchObject({
      ok: false,
      failure: 'wrong-platform',
      detail: 'win32-x64',
    });
  });

  it('reports a missing arduino-cli', async () => {
    await rm(join(root, 'arduino-cli'));
    expect(await manager({}).installLibraries()).toEqual({ ok: false, failure: 'tool-missing' });
  });
});
