import { COLOURS } from '@ideblock/blocks';
import * as Blockly from 'blockly/core';

type Appearance = 'light' | 'dark' | 'high-contrast';

const blockStyle = (colour: string) => ({
  colourPrimary: colour,
  colourSecondary: colour,
  colourTertiary: '#4a4a4a',
});

// Built-in Blockly blocks take their colour from these named styles.
const BLOCK_STYLES = {
  logic_blocks: blockStyle(COLOURS.logic),
  loop_blocks: blockStyle(COLOURS.loops),
  math_blocks: blockStyle(COLOURS.math),
  text_blocks: blockStyle(COLOURS.text),
  variable_blocks: blockStyle(COLOURS.variables),
  variable_dynamic_blocks: blockStyle(COLOURS.variables),
  procedure_blocks: blockStyle(COLOURS.functions),
  hat_blocks: { ...blockStyle(COLOURS.program), hat: 'cap' },
};

const COMPONENTS: Record<Appearance, Blockly.Theme.ComponentStyle> = {
  light: {
    workspaceBackgroundColour: '#ffffff',
    toolboxBackgroundColour: '#eef0f6',
    toolboxForegroundColour: '#1b1f2a',
    flyoutBackgroundColour: '#dfe3ee',
    flyoutForegroundColour: '#1b1f2a',
    flyoutOpacity: 1,
    scrollbarColour: '#9aa3b8',
    insertionMarkerColour: '#1b1f2a',
    insertionMarkerOpacity: 0.3,
    cursorColour: '#b34700',
  },
  dark: {
    workspaceBackgroundColour: '#1d2230',
    toolboxBackgroundColour: '#262c3d',
    toolboxForegroundColour: '#eef1f8',
    flyoutBackgroundColour: '#2f3649',
    flyoutForegroundColour: '#eef1f8',
    flyoutOpacity: 1,
    scrollbarColour: '#5a6480',
    insertionMarkerColour: '#ffffff',
    insertionMarkerOpacity: 0.3,
    cursorColour: '#ffb366',
  },
  'high-contrast': {
    workspaceBackgroundColour: '#000000',
    toolboxBackgroundColour: '#000000',
    toolboxForegroundColour: '#ffffff',
    flyoutBackgroundColour: '#1a1a1a',
    flyoutForegroundColour: '#ffffff',
    flyoutOpacity: 1,
    scrollbarColour: '#ffffff',
    insertionMarkerColour: '#ffff00',
    insertionMarkerOpacity: 0.5,
    cursorColour: '#00ffff',
  },
};

const themes = new Map<string, Blockly.Theme>();

export function blocklyTheme(appearance: Appearance, fontScale: number): Blockly.Theme {
  const name = `ideblock-${appearance}-${Math.round(fontScale * 100)}`;
  let theme = themes.get(name);
  if (!theme) {
    theme = Blockly.Theme.defineTheme(name, {
      name,
      base: Blockly.Themes.Classic,
      blockStyles: BLOCK_STYLES,
      componentStyles: COMPONENTS[appearance],
      fontStyle: {
        family: "'Atkinson Hyperlegible', system-ui, sans-serif",
        weight: '700',
        size: Math.round(12 * fontScale),
      },
      startHats: true,
    });
    themes.set(name, theme);
  }
  return theme;
}

/** Resolves the "system" theme to the colours currently in use. */
export function currentAppearance(theme: string): Appearance {
  if (theme === 'light' || theme === 'dark' || theme === 'high-contrast') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
