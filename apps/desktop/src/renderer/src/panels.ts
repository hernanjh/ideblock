import type { Settings } from '@ideblock/shared';
import type { ShortcutId } from './shortcuts';

export type PanelId = 'blocks' | 'code' | 'simulator' | 'console';

export const PANEL_VISIBILITY: Record<
  PanelId,
  {
    setting: keyof Pick<
      Settings,
      'blocksVisible' | 'codeVisible' | 'simulatorVisible' | 'consoleVisible'
    >;
    shortcut: ShortcutId;
  }
> = {
  blocks: { setting: 'blocksVisible', shortcut: 'toggleBlocks' },
  code: { setting: 'codeVisible', shortcut: 'toggleCode' },
  simulator: { setting: 'simulatorVisible', shortcut: 'toggleSimulator' },
  console: { setting: 'consoleVisible', shortcut: 'toggleConsole' },
};
