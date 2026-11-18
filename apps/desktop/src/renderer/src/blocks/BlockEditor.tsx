import { getBoard } from '@ideblock/boards';
import {
  applyBlockMessages,
  buildToolbox,
  toolboxBlock,
  toolboxBlockTypes,
  type ToolboxLevel,
  createSketchGenerator,
  emptyWorkspaceState,
  registerBlocks,
  setActiveBoard,
} from '@ideblock/blocks';
import type { SupportedLanguage } from '@ideblock/i18n';
import * as Blockly from 'blockly/core';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../state/project';
import { useSettingsStore } from '../state/settings';
import { useSimulationStore } from '../state/simulation';
import { registerIconCategory } from './category';
import { blocklyTheme, currentAppearance } from './theme';

const RESULTS_ID = 'results';

/** Searchable text of each toolbox block, in the current language. */
function blockTexts(level: ToolboxLevel): Map<string, string> {
  const workspace = new Blockly.Workspace();
  const texts = new Map<string, string>();
  try {
    for (const type of toolboxBlockTypes(level)) {
      const block = workspace.newBlock(type);
      texts.set(type, block.toString().toLowerCase());
    }
  } finally {
    workspace.dispose();
  }
  return texts;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

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
    registerIconCategory();
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

  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const toolbox = buildToolbox(blockLevel);
    const search = normalize(query.trim());
    if (search === '') {
      workspace.updateToolbox(toolbox);
      return;
    }
    // Matching blocks are shown in a results category at the top.
    const texts = blockTexts(blockLevel);
    const matches = [...texts]
      .filter(([, text]) => normalize(text).includes(search))
      .map(([type]) => toolboxBlock(type))
      .filter((block) => block !== undefined);
    const results = {
      kind: 'category',
      toolboxitemid: RESULTS_ID,
      name: t('blocks.results', { count: matches.length }),
      colour: '#5b6cff',
      contents: matches.length > 0 ? matches : [{ kind: 'label', text: t('blocks.noResults') }],
    };
    workspace.updateToolbox({
      ...toolbox,
      contents: [results, ...toolbox.contents],
    } as unknown as Blockly.utils.toolbox.ToolboxDefinition);
    const toolboxView = workspace.getToolbox() as Blockly.Toolbox | null;
    const resultsItem = toolboxView?.getToolboxItemById(RESULTS_ID);
    if (resultsItem) toolboxView?.setSelectedItem(resultsItem);
  }, [blockLevel, query, language, t]);

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

  return (
    <>
      <label className="block-search">
        <Search aria-hidden="true" size="1em" />
        <input
          value={query}
          placeholder={t('blocks.search')}
          aria-label={t('blocks.search')}
          data-testid="block-search"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
        />
        {query && (
          <button
            type="button"
            className="icon-button"
            aria-label={t('blocks.clearSearch')}
            title={t('blocks.clearSearch')}
            onClick={() => setQuery('')}
          >
            <X aria-hidden="true" size="1em" />
          </button>
        )}
      </label>
      <div ref={containerRef} className="block-editor" data-testid="block-editor" />
    </>
  );
}
