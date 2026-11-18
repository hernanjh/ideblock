import { toSketchName } from './names';
import {
  CURRENT_FORMAT_VERSION,
  EMPTY_CIRCUIT,
  circuitSchema,
  manifestSchema,
  workspaceStateSchema,
  type ProjectDocument,
} from './schema';

export const MANIFEST_FILE = 'ideblock.json';
export const BLOCKS_FILE = 'blocks.json';
export const CIRCUIT_FILE = 'circuit.json';

/** File name to contents, relative to the project folder. */
export type ProjectFiles = Record<string, string>;

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export function inoFileName(folderName: string): string {
  return `${folderName}.ino`;
}

/**
 * Lays out a project for writing. The folder name decides the sketch file
 * name, because arduino-cli requires both to match.
 */
export function projectToFiles(project: ProjectDocument, folderName: string): ProjectFiles {
  const files: ProjectFiles = {
    [MANIFEST_FILE]: json({ ...project.manifest, formatVersion: CURRENT_FORMAT_VERSION }),
    [CIRCUIT_FILE]: json(project.circuit),
    [inoFileName(folderName)]: project.code,
  };
  if (project.blocks) files[BLOCKS_FILE] = json(project.blocks);
  return files;
}

export class ProjectFormatError extends Error {
  constructor(
    readonly reason: 'unsupported-version' | 'invalid-manifest' | 'invalid-file' | 'missing-sketch',
    message: string,
  ) {
    super(message);
    this.name = 'ProjectFormatError';
  }
}

function parseJson(content: string, file: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new ProjectFormatError('invalid-file', `${file} is not valid JSON`);
  }
}

/** Reads a project folder. Missing optional files fall back to empty values. */
export function filesToProject(files: ProjectFiles, folderName: string): ProjectDocument {
  const manifestContent = files[MANIFEST_FILE];
  const code = files[inoFileName(folderName)];

  if (manifestContent === undefined) {
    if (code === undefined) {
      throw new ProjectFormatError('missing-sketch', `${inoFileName(folderName)} not found`);
    }
    return importSketch(code, folderName);
  }

  const rawManifest = parseJson(manifestContent, MANIFEST_FILE);
  const parsed = manifestSchema.safeParse(rawManifest);
  if (!parsed.success) {
    throw new ProjectFormatError('invalid-manifest', parsed.error.message);
  }
  if (parsed.data.formatVersion > CURRENT_FORMAT_VERSION) {
    throw new ProjectFormatError(
      'unsupported-version',
      `Format version ${parsed.data.formatVersion} is newer than this application supports`,
    );
  }

  const blocksContent = files[BLOCKS_FILE];
  const blocks =
    blocksContent === undefined
      ? null
      : workspaceStateSchema.parse(parseJson(blocksContent, BLOCKS_FILE));

  const circuitContent = files[CIRCUIT_FILE];
  const circuitResult =
    circuitContent === undefined
      ? { success: true as const, data: EMPTY_CIRCUIT }
      : circuitSchema.safeParse(parseJson(circuitContent, CIRCUIT_FILE));
  if (!circuitResult.success) {
    throw new ProjectFormatError('invalid-file', `${CIRCUIT_FILE}: ${circuitResult.error.message}`);
  }

  return {
    manifest: parsed.data,
    blocks,
    code: code ?? '',
    circuit: circuitResult.data,
  };
}

/** A plain sketch from another IDE opens as a code project for the default board. */
export function importSketch(code: string, name: string, boardId = 'uno'): ProjectDocument {
  return {
    manifest: {
      formatVersion: CURRENT_FORMAT_VERSION,
      name,
      board: boardId,
      mode: 'code',
    },
    blocks: null,
    code,
    circuit: EMPTY_CIRCUIT,
  };
}

export function createProject(name: string, boardId: string): ProjectDocument {
  return {
    manifest: { formatVersion: CURRENT_FORMAT_VERSION, name, board: boardId, mode: 'blocks' },
    blocks: null,
    code: '',
    circuit: EMPTY_CIRCUIT,
  };
}

export function defaultFolderName(project: ProjectDocument): string {
  return toSketchName(project.manifest.name);
}
