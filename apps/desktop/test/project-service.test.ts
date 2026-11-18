import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProject } from '@ideblock/project';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectService } from '../src/main/project-service';

const examplesDir = join(import.meta.dirname, '..', '..', '..', 'examples');

describe('ProjectService', () => {
  let dir: string;
  let service: ProjectService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ideblock-projects-'));
    service = new ProjectService(join(dir, 'user-data'), examplesDir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const project = {
    ...createProject('Mi semáforo', 'uno'),
    code: 'void setup() {}\nvoid loop() {}\n',
  };

  it('saves a project folder and opens it again', async () => {
    const folder = service.folderForSave(join(dir, 'Mi semáforo'));
    expect(folder).toBe(join(dir, 'Mi_semaforo'));

    const saved = await service.save(project, folder);
    expect(saved).toEqual({ ok: true, value: folder });
    expect((await readdir(folder)).sort()).toEqual([
      'Mi_semaforo.ino',
      'circuit.json',
      'ideblock.json',
    ]);

    const opened = await service.openPath(join(folder, 'ideblock.json'));
    expect(opened).toEqual({ ok: true, value: { project, path: folder } });
    expect(await service.recent()).toEqual([{ path: folder, name: 'Mi semáforo' }]);
  });

  it('opens a sketch made with another IDE', async () => {
    const folder = join(dir, 'Blink');
    await mkdir(folder);
    await writeFile(join(folder, 'Blink.ino'), 'void loop() {}');

    const opened = await service.openPath(join(folder, 'Blink.ino'));
    expect(opened.ok && opened.value.project.manifest.mode).toBe('code');
    expect(opened.ok && opened.value.path).toBe(folder);
  });

  it('imports a loose sketch without taking over its folder', async () => {
    await writeFile(join(dir, 'Other.ino'), 'void loop() {}');
    const opened = await service.openPath(join(dir, 'Other.ino'));
    expect(opened.ok && opened.value.path).toBeNull();
  });

  it('reports a missing project', async () => {
    expect(await service.openPath(join(dir, 'nothing'))).toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('exports the sketch as a standard .ino file', async () => {
    const result = await service.exportSketch('void loop() {}', join(dir, 'Copy'));
    expect(result).toEqual({ ok: true, value: join(dir, 'Copy.ino') });
    expect(await readFile(join(dir, 'Copy.ino'), 'utf8')).toBe('void loop() {}');
  });

  it('lists the bundled examples in teaching order', async () => {
    const examples = await service.listExamples();
    // The first example needs nothing wired: the board's own LED.
    expect(examples.slice(0, 2).map((example) => example.id)).toEqual(['BoardBlink', 'Blink']);
    expect(examples.every((example) => example.title.es && example.title.en)).toBe(true);
  });

  it('loads examples and rejects unknown ids', async () => {
    const example = await service.loadExample('Blink');
    expect(example.ok && example.value.manifest.example?.title.es).toBe('LED que parpadea');
    expect(await service.loadExample('../../etc')).toEqual({ ok: false, reason: 'not-found' });
  });

  it('keeps the session between launches', async () => {
    expect(await service.loadSession()).toBeNull();
    await service.saveSession({ project, path: null });
    expect(await service.loadSession()).toEqual({ project, path: null });
  });
});
