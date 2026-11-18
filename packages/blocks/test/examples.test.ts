import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getBoard } from '@ideblock/boards';
import { filesToProject, inoFileName } from '@ideblock/project';
import * as Blockly from 'blockly/core';
import { describe, expect, it } from 'vitest';
import { applyBlockMessages, createSketchGenerator } from '../src';

const examplesDir = join(import.meta.dirname, '..', '..', '..', 'examples');
// Run with UPDATE_EXAMPLES=1 to rewrite the .ino files after changing blocks or generators.
const update = process.env['UPDATE_EXAMPLES'] === '1';

function readFolder(folder: string): Record<string, string> {
  const dir = join(examplesDir, folder);
  return Object.fromEntries(
    readdirSync(dir).map((file) => [file, readFileSync(join(dir, file), 'utf8')]),
  );
}

describe('bundled examples', () => {
  const folders = readdirSync(examplesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  it('exist', () => {
    expect(folders.length).toBeGreaterThan(0);
  });

  for (const folder of folders) {
    it(`${folder} has a sketch that matches its blocks`, () => {
      const project = filesToProject(readFolder(folder), folder);
      expect(project.manifest.example?.title.en).toBeTruthy();
      expect(project.manifest.example?.title.es).toBeTruthy();

      applyBlockMessages('en');
      const generator = createSketchGenerator(getBoard(project.manifest.board));
      const workspace = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(project.blocks ?? {}, workspace);
        const { code } = generator.generate(workspace);
        if (update) {
          writeFileSync(join(examplesDir, folder, inoFileName(folder)), code);
        } else {
          expect(project.code).toBe(code);
        }
      } finally {
        workspace.dispose();
      }
    });
  }
});
