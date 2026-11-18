import { PROGRAM_BLOCK_TYPE } from './generator/sketch-generator';

/** Serialized state of a new project: just the program block, which cannot be deleted. */
export function emptyWorkspaceState() {
  return {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: PROGRAM_BLOCK_TYPE,
          id: 'program',
          x: 40,
          y: 40,
          deletable: false,
        },
      ],
    },
  };
}
