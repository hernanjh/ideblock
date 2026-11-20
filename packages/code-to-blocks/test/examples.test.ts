import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getBoard } from '@ideblock/boards';
import { filesToProject } from '@ideblock/project';
import { describe, expect, it } from 'vitest';
import { codeToBlocks, type CircuitPart } from '../src';
import { examplesDir, files, generate } from './helpers';

describe('converting the bundled examples back to blocks', () => {
  const folders = readdirSync(examplesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const folder of folders) {
    it(`${folder} gives the same code again, without code blocks`, async () => {
      const dir = join(examplesDir, folder);
      const project = filesToProject(
        Object.fromEntries(
          readdirSync(dir).map((file) => [file, readFileSync(join(dir, file), 'utf8')]),
        ),
        folder,
      );
      const board = project.manifest.board;
      const parts = (project.circuit?.components ?? []) as unknown as CircuitPart[];
      const result = await codeToBlocks(project.code, { board: getBoard(board), parts, files });
      expect(result.syntaxError).toBe(false);
      expect(generate(result.state, board)).toBe(project.code);
      expect(result.codeBlocks).toBe(0);
    });
  }
});
