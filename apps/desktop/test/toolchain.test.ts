import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArduinoCli, configurationYaml } from '../src/main/toolchain/arduino-cli';
import { ToolchainService } from '../src/main/toolchain/toolchain-service';

describe('configurationYaml', () => {
  it('keeps every folder inside the app data root', () => {
    const yaml = configurationYaml('/data/arduino');
    expect(yaml).toContain('data: "/data/arduino/data"');
    expect(yaml).toContain('user: "/data/arduino/user"');
    expect(yaml).toContain('package_esp32_index.json');
  });
});

describe('ToolchainService', () => {
  it('reports a missing arduino-cli binary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ideblock-toolchain-'));
    try {
      const cli = new ArduinoCli({ binary: join(root, 'missing'), dataRoot: root });
      const service = new ToolchainService(cli, join(root, 'build'), () => undefined);
      const result = await service.compile({
        code: '',
        boardId: 'uno',
        sketchName: 'test',
        libraries: [],
      });
      expect(result).toMatchObject({ ok: false, failure: 'tool-missing' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

// Needs the real arduino-cli (npm run fetch:toolchain) and downloads the AVR
// core on first use, so it only runs when explicitly requested.
const integration = process.env['IDEBLOCK_TOOLCHAIN_TESTS'] === '1';

describe.runIf(integration)('ToolchainService with arduino-cli', () => {
  const binary = join(import.meta.dirname, '..', 'resources', 'bin', 'arduino-cli');
  const dataRoot = process.env['IDEBLOCK_ARDUINO_DATA_DIR'] ?? join(tmpdir(), 'ideblock-arduino');

  it('compiles a sketch and reports errors with explanations', { timeout: 600_000 }, async () => {
    const build = await mkdtemp(join(tmpdir(), 'ideblock-build-'));
    const progress: string[] = [];
    const service = new ToolchainService(new ArduinoCli({ binary, dataRoot }), build, (event) =>
      progress.push(event.stage),
    );

    const ok = await service.compile({
      code: 'void setup() { pinMode(13, OUTPUT); }\nvoid loop() { digitalWrite(13, HIGH); }\n',
      boardId: 'uno',
      sketchName: 'Mi prueba',
      libraries: ['Servo'],
    });
    expect(ok.ok).toBe(true);
    expect(ok.hex).toMatch(/^:/);
    expect(ok.program?.max).toBe(32256);

    const broken = await service.compile({
      code: 'void setup() {\n  foo();\n}\nvoid loop() {}\n',
      boardId: 'uno',
      sketchName: 'Mi prueba',
      libraries: [],
    });
    expect(broken.ok).toBe(false);
    expect(broken.diagnostics[0]).toMatchObject({ file: 'Mi_prueba.ino', line: 2, inSketch: true });
    await rm(build, { recursive: true, force: true });
  });
});
