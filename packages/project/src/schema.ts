import { z } from 'zod';

export const CURRENT_FORMAT_VERSION = 1;

export const PROJECT_MODES = ['blocks', 'code'] as const;
export type ProjectMode = (typeof PROJECT_MODES)[number];

const localizedText = z.object({ en: z.string(), es: z.string() }).partial();

/** Contents of ideblock.json. Unknown fields are kept so newer files survive a round trip. */
export const manifestSchema = z.looseObject({
  formatVersion: z.number().int().positive(),
  name: z.string().min(1),
  board: z.string().min(1),
  mode: z.enum(PROJECT_MODES),
  example: z
    .object({
      title: localizedText,
      description: localizedText,
      level: z.number().int().min(1).max(3),
      order: z.number().int().optional(),
    })
    .optional(),
});

export type ProjectManifest = z.infer<typeof manifestSchema>;

export const circuitSchema = z.looseObject({
  formatVersion: z.number().int().positive(),
  components: z.array(z.looseObject({ id: z.string(), type: z.string() })),
  connections: z.array(z.looseObject({ from: z.string(), to: z.string() })),
});

export type CircuitDocument = z.infer<typeof circuitSchema>;

export const EMPTY_CIRCUIT: CircuitDocument = {
  formatVersion: 1,
  components: [],
  connections: [],
};

export const workspaceStateSchema = z.record(z.string(), z.unknown());
export type WorkspaceState = z.infer<typeof workspaceStateSchema>;

/** A project as handled by the application, independent of where it is stored. */
export const projectDocumentSchema = z.object({
  manifest: manifestSchema,
  blocks: workspaceStateSchema.nullable(),
  code: z.string(),
  circuit: circuitSchema,
});

export type ProjectDocument = z.infer<typeof projectDocumentSchema>;
