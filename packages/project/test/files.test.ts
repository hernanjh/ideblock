import { describe, expect, it } from 'vitest';
import {
  BLOCKS_FILE,
  CIRCUIT_FILE,
  MANIFEST_FILE,
  ProjectFormatError,
  createProject,
  filesToProject,
  projectToFiles,
} from '../src';

describe('project files', () => {
  const project = {
    ...createProject('Traffic light', 'nano'),
    blocks: { blocks: { languageVersion: 0, blocks: [] } },
    code: 'void setup() {}\nvoid loop() {}\n',
  };

  it('round-trips a project', () => {
    const files = projectToFiles(project, 'Traffic_light');
    expect(Object.keys(files).sort()).toEqual(
      [BLOCKS_FILE, CIRCUIT_FILE, MANIFEST_FILE, 'Traffic_light.ino'].sort(),
    );
    expect(filesToProject(files, 'Traffic_light')).toEqual(project);
  });

  it('keeps hand wiring: the mode, positions, breadboards and wires', () => {
    const wired = {
      ...project,
      circuit: {
        formatVersion: 1,
        wiring: 'manual',
        components: [
          { id: 'breadboard1', type: 'breadboard', pins: {}, x: 500, y: 200 },
          { id: 'led1', type: 'led', pins: { anode: '13' }, x: 520.4, y: 210 },
          { id: 'resistor1', type: 'resistor', pins: {} },
        ],
        connections: [{ id: 'wire1', from: 'board:13', to: 'breadboard1:a10', color: '#1e88e5' }],
      },
    };
    expect(filesToProject(projectToFiles(wired, 'Wired'), 'Wired')).toEqual(wired);
  });

  it('writes readable, diff-friendly JSON', () => {
    const files = projectToFiles(project, 'Traffic_light');
    expect(files[MANIFEST_FILE]).toBe(
      '{\n  "formatVersion": 1,\n  "name": "Traffic light",\n  "board": "nano",\n  "mode": "blocks"\n}\n',
    );
  });

  it('keeps unknown manifest fields from newer minor versions', () => {
    const files = projectToFiles(project, 'p');
    files[MANIFEST_FILE] = files[MANIFEST_FILE]!.replace('"mode"', '"teacher": "Ada",\n  "mode"');
    const reread = filesToProject(files, 'p');
    expect(reread.manifest).toMatchObject({ teacher: 'Ada' });
    expect(projectToFiles(reread, 'p')[MANIFEST_FILE]).toContain('"teacher": "Ada"');
  });

  it('opens a plain sketch as a code project', () => {
    const opened = filesToProject({ 'Blink.ino': 'void loop() {}' }, 'Blink');
    expect(opened.manifest.mode).toBe('code');
    expect(opened.code).toBe('void loop() {}');
    expect(opened.blocks).toBeNull();
  });

  it('rejects projects from a newer format', () => {
    const files = projectToFiles(project, 'p');
    files[MANIFEST_FILE] = files[MANIFEST_FILE]!.replace(
      '"formatVersion": 1',
      '"formatVersion": 99',
    );
    expect(() => filesToProject(files, 'p')).toThrow(ProjectFormatError);
  });

  it('reports corrupt files instead of losing data silently', () => {
    const files = projectToFiles(project, 'p');
    files[BLOCKS_FILE] = '{broken';
    expect(() => filesToProject(files, 'p')).toThrow(/blocks.json/);
  });

  it('fails when there is nothing to open', () => {
    expect(() => filesToProject({}, 'p')).toThrow(ProjectFormatError);
  });
});
