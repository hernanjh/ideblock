import { getBoard } from '@ideblock/boards';
import {
  applyBlockMessages,
  buildToolbox,
  createSketchGenerator,
  emptyWorkspaceState,
  registerBlocks,
  setActiveBoard,
} from '@ideblock/blocks';
import type { SupportedLanguage } from '@ideblock/i18n';
import * as Blockly from 'blockly/core';
import { useEffect, useRef } from 'react';
import { useProjectStore } from '../state/project';
import { useSettingsStore } from '../state/settings';
import { useSimulationStore } from '../state/simulation';
import { blocklyTheme, currentAppearance } from './theme';

const MEDIA_PATH = './blockly-media/';
const GENERATE_DELAY_MS = 150;

interface BlockEditorProps {
  language: SupportedLanguage;
}

/**
 * Hosts the Blockly workspace. Blockly resolves block text when blocks are
 * created, so a language change re-creates the workspace from its saved state.
 */
export function BlockEditor({ language }: BlockEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  const theme = useSettingsStore((state) => state.settings.theme);
  const fontScale = useSettingsStore((state) => state.settings.fontScale);
  const blockLevel = useSettingsStore((state) => state.settings.blockLevel);
  const boardId = useProjectStore((state) => state.boardId);
  const activeBlockId = useSimulationStore((state) => state.activeBlockId);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    applyBlockMessages(language);
    registerBlocks();
    const { settings } = useSettingsStore.getState();
    const workspace = Blockly.inject(container, {
      toolbox: buildToolbox(settings.blockLevel),
      renderer: 'zelos',
      theme: blocklyTheme(currentAppearance(settings.theme), settings.fontScale),
      media: MEDIA_PATH,
      trashcan: true,
      sounds: false,
      move: { scrollbars: true, drag: true, wheel: true },
      zoom: { controls: true, wheel: false, startScale: 0.9, maxScale: 2, minScale: 0.4 },
      grid: { spacing: 24, length: 2, colour: '#c9cede', snap: true },
    });
    workspaceRef.current = workspace;

    const saved = useProjectStore.getState().workspaceState ?? emptyWorkspaceState();
    Blockly.Events.disable();
    try {
      Blockly.serialization.workspaces.load(saved, workspace);
    } finally {
      Blockly.Events.enable();
    }
    // Files may omit block ids; keeping the generated ones lets the simulator
    // refer to the same blocks shown on screen.
    useProjectStore.getState().syncWorkspaceState(Blockly.serialization.workspaces.save(workspace));

    let timer: ReturnType<typeof setTimeout> | undefined;
    const regenerate = (): void => {
      const project = useProjectStore.getState();
      const board = getBoard(project.boardId);
      setActiveBoard(board);
      const generator = createSketchGenerator(board);
      project.setSketch(generator.generate(workspace));
    };
    const onChange = (event: Blockly.Events.Abstract): void => {
      if (event.isUiEvent) return;
      Blockly.Events.disableOrphans(event);
      useProjectStore
        .getState()
        .setWorkspaceState(Blockly.serialization.workspaces.save(workspace));
      clearTimeout(timer);
      timer = setTimeout(regenerate, GENERATE_DELAY_MS);
    };
    workspace.addChangeListener(onChange);
    regenerate();

    const resizeObserver = new ResizeObserver(() => Blockly.svgResize(workspace));
    resizeObserver.observe(container);

    return () => {
      // The store already holds the latest state from the change listener;
      // saving here could overwrite a project that has just been loaded.
      clearTimeout(timer);
      resizeObserver.disconnect();
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [language]);

  useEffect(() => {
    workspaceRef.current?.setTheme(blocklyTheme(currentAppearance(theme), fontScale));
  }, [theme, fontScale]);

  useEffect(() => {
    workspaceRef.current?.updateToolbox(buildToolbox(blockLevel));
  }, [blockLevel]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const board = getBoard(boardId);
    setActiveBoard(board);
    useProjectStore.getState().setSketch(createSketchGenerator(board).generate(workspace));
  }, [boardId]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    // Shows which block the simulated board is running right now.
    workspace?.highlightBlock(activeBlockId);
  }, [activeBlockId]);

  return <div ref={containerRef} className="block-editor" data-testid="block-editor" />;
}
