export type ShortcutId =
  | 'viewBlocks'
  | 'viewSplit'
  | 'viewCode'
  | 'toggleSimulator'
  | 'toggleConsole'
  | 'fontIncrease'
  | 'fontDecrease'
  | 'fontReset';

interface ShortcutDefinition {
  keys: readonly string[];
  /** Key shown to the user after the modifier. */
  display: string;
}

/** All shortcuts use Ctrl (Cmd on macOS) without Alt. */
export const SHORTCUTS: Record<ShortcutId, ShortcutDefinition> = {
  viewBlocks: { keys: ['1'], display: '1' },
  viewSplit: { keys: ['2'], display: '2' },
  viewCode: { keys: ['3'], display: '3' },
  toggleSimulator: { keys: ['4'], display: '4' },
  toggleConsole: { keys: ['j', 'J'], display: 'J' },
  fontIncrease: { keys: ['+', '='], display: '+' },
  fontDecrease: { keys: ['-', '_'], display: '−' },
  fontReset: { keys: ['0'], display: '0' },
};

export function matchShortcut(event: KeyboardEvent): ShortcutId | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return null;
  }
  for (const [id, definition] of Object.entries(SHORTCUTS) as [ShortcutId, ShortcutDefinition][]) {
    if (definition.keys.includes(event.key)) {
      return id;
    }
  }
  return null;
}

export function formatShortcut(id: ShortcutId, platform: string | undefined): string {
  const modifier = platform === 'darwin' ? '⌘' : 'Ctrl+';
  return `${modifier}${SHORTCUTS[id].display}`;
}
