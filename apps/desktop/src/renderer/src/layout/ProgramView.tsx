import { PANEL_LIMITS } from '@ideblock/shared';
import {
  AppWindow,
  Blocks,
  Check,
  Code,
  Cpu,
  Lock,
  Maximize2,
  Minimize2,
  PencilLine,
  RefreshCw,
  Waypoints,
  X,
} from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useShortcutHint } from '../hooks/useShortcutHint';
import { useProjectStore } from '../state/project';
import { useSettingsStore } from '../state/settings';
import { useUiStore } from '../state/ui';
import { Splitter } from './Splitter';

interface ProgramViewProps {
  blocks: ReactNode;
  blocksActions: ReactNode;
  code: ReactNode;
  simulator: ReactNode;
  console: ReactNode;
}

const percent = (fraction: number): string => `${fraction * 100}%`;

/** Main screen: blocks and code side by side, the console below and the simulator on the right. */
export function ProgramView({ blocks, blocksActions, code, simulator, console }: ProgramViewProps) {
  const { t } = useTranslation();
  const hint = useShortcutHint();
  const settings = useSettingsStore((state) => state.settings);
  const preview = useSettingsStore((state) => state.preview);
  const update = useSettingsStore((state) => state.update);
  const detached = useUiStore((state) => state.simulatorDetached);
  const setView = useUiStore((state) => state.setView);
  const mode = useProjectStore((state) => state.mode);

  const rootRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const editorsRef = useRef<HTMLDivElement>(null);

  const { blocksVisible, codeVisible, consoleVisible } = settings;
  const simulatorVisible = settings.simulatorVisible && !detached;
  const focused = !settings.simulatorVisible && !consoleVisible;

  return (
    <div className="program-view" ref={rootRef} data-testid="workspace">
      <div className="program-view__column" ref={columnRef}>
        <section className="card editor-card" aria-label={t('panels.editor')}>
          <div className="card__header">
            <button
              type="button"
              className="chip-toggle"
              aria-pressed={blocksVisible}
              title={hint(
                t(blocksVisible ? 'panels.hide' : 'panels.show', { panel: t('panels.blocks') }),
                'toggleBlocks',
              )}
              data-testid="toggle-blocks"
              onClick={() => void update({ blocksVisible: !blocksVisible })}
            >
              <Blocks aria-hidden="true" size="1.1em" />
              {t('panels.blocks')}
              {blocksVisible && <Check aria-hidden="true" size="0.95em" />}
            </button>
            <button
              type="button"
              className="chip-toggle"
              aria-pressed={codeVisible}
              title={hint(
                t(codeVisible ? 'panels.hide' : 'panels.show', { panel: t('panels.code') }),
                'toggleCode',
              )}
              data-testid="toggle-code"
              onClick={() => void update({ codeVisible: !codeVisible })}
            >
              <Code aria-hidden="true" size="1.1em" />
              {t('panels.code')}
              {codeVisible && <Check aria-hidden="true" size="0.95em" />}
            </button>
            {mode === 'blocks' ? (
              <span className="sync-badge">
                <RefreshCw aria-hidden="true" size="0.9em" />
                {t('editor.synced')}
              </span>
            ) : (
              <span className="sync-badge sync-badge--manual">
                <PencilLine aria-hidden="true" size="0.9em" />
                {t('editor.handWritten')}
              </span>
            )}
            <div className="card__end">
              {blocksVisible && blocksActions}
              <button
                type="button"
                className="icon-button icon-button--framed"
                aria-label={focused ? t('editor.restore') : t('editor.focus')}
                title={focused ? t('editor.restore') : t('editor.focus')}
                aria-pressed={focused}
                data-testid="editor-focus"
                onClick={() =>
                  void update(
                    focused
                      ? { simulatorVisible: true, consoleVisible: true }
                      : { simulatorVisible: false, consoleVisible: false },
                  )
                }
              >
                {focused ? (
                  <Minimize2 aria-hidden="true" size="1.1em" />
                ) : (
                  <Maximize2 aria-hidden="true" size="1.1em" />
                )}
              </button>
            </div>
          </div>
          <div className="editor-card__body" ref={editorsRef}>
            {blocksVisible && (
              <div
                className="editor-pane"
                data-testid="panel-blocks"
                style={codeVisible ? { flex: `0 0 ${percent(settings.editorSplit)}` } : undefined}
              >
                <h2 className="visually-hidden">{t('panels.blocks')}</h2>
                {blocks}
              </div>
            )}
            {blocksVisible && codeVisible && (
              <Splitter
                orientation="vertical"
                containerRef={editorsRef}
                value={settings.editorSplit}
                {...PANEL_LIMITS.editorSplit}
                label={t('panels.resize', { panel: t('panels.blocks') })}
                testId="splitter-editors"
                onChange={(editorSplit) => preview({ editorSplit })}
                onCommit={(editorSplit) => void update({ editorSplit })}
              />
            )}
            {codeVisible && (
              <div className="editor-pane editor-pane--code" data-testid="panel-code">
                <h2 className="editor-pane__title">
                  {mode === 'blocks' ? (
                    <Lock aria-hidden="true" size="0.9em" />
                  ) : (
                    <PencilLine aria-hidden="true" size="0.9em" />
                  )}
                  {mode === 'blocks' ? t('editor.writtenByBlocks') : t('panels.code')}
                </h2>
                <div className="editor-pane__content">{code}</div>
              </div>
            )}
            {!blocksVisible && !codeVisible && (
              <div className="workspace__empty" data-testid="workspace-empty">
                <p>{t('panels.allHidden')}</p>
                <div className="field__row">
                  <button type="button" onClick={() => void update({ blocksVisible: true })}>
                    <Blocks aria-hidden="true" size="1.1em" />
                    {t('panels.show', { panel: t('panels.blocks') })}
                  </button>
                  <button type="button" onClick={() => void update({ codeVisible: true })}>
                    <Code aria-hidden="true" size="1.1em" />
                    {t('panels.show', { panel: t('panels.code') })}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {consoleVisible && (
          <>
            <Splitter
              orientation="horizontal"
              containerRef={columnRef}
              value={settings.consoleSize}
              {...PANEL_LIMITS.consoleSize}
              controlsTrailingPanel
              label={t('panels.resize', { panel: t('panels.console') })}
              testId="splitter-console"
              onChange={(consoleSize) => preview({ consoleSize })}
              onCommit={(consoleSize) => void update({ consoleSize })}
            />
            <div
              className="program-view__console"
              style={{ flex: `0 0 ${percent(settings.consoleSize)}` }}
            >
              {console}
            </div>
          </>
        )}
      </div>

      {simulatorVisible && (
        <>
          <Splitter
            orientation="vertical"
            containerRef={rootRef}
            value={settings.simulatorSize}
            {...PANEL_LIMITS.simulatorSize}
            controlsTrailingPanel
            label={t('panels.resize', { panel: t('panels.simulator') })}
            testId="splitter-simulator"
            onChange={(simulatorSize) => preview({ simulatorSize })}
            onCommit={(simulatorSize) => void update({ simulatorSize })}
          />
          <section
            className="card simulator-card"
            data-testid="panel-simulator"
            aria-label={t('panels.simulator')}
            style={{ flex: `0 0 ${percent(settings.simulatorSize)}` }}
          >
            <div className="card__header">
              <div className="tabs">
                <span className="tab tab--static" aria-selected="true">
                  <Cpu aria-hidden="true" size="1.1em" />
                  {t('panels.simulator')}
                </span>
                <button
                  type="button"
                  className="tab"
                  data-testid="open-circuit"
                  onClick={() => setView('circuit')}
                >
                  <Waypoints aria-hidden="true" size="1.1em" />
                  {t('rail.circuit')}
                </button>
              </div>
              <div className="card__end">
                <button
                  type="button"
                  className="icon-button icon-button--framed"
                  aria-label={t('simulator.detach')}
                  title={t('simulator.detach')}
                  data-testid="simulator-detach"
                  onClick={() => void window.ideblock.invoke('simulator:detach')}
                >
                  <AppWindow aria-hidden="true" size="1.1em" />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--framed"
                  aria-label={t('panels.close', { panel: t('panels.simulator') })}
                  title={t('panels.close', { panel: t('panels.simulator') })}
                  data-testid="panel-simulator-close"
                  onClick={() => void update({ simulatorVisible: false })}
                >
                  <X aria-hidden="true" size="1.1em" />
                </button>
              </div>
            </div>
            <div className="card__body">{simulator}</div>
          </section>
        </>
      )}
    </div>
  );
}
