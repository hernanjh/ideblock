import { PANEL_LIMITS } from '@ideblock/shared';
import { Blocks, Code, Cpu, Terminal } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../state/settings';
import { useUiStore } from '../state/ui';
import { Panel } from './Panel';
import { Splitter } from './Splitter';

interface WorkspaceProps {
  blocks: ReactNode;
  blocksActions?: ReactNode;
  code: ReactNode;
  simulator: ReactNode;
  simulatorActions?: ReactNode;
  console: ReactNode;
}

const percent = (fraction: number): string => `${fraction * 100}%`;

export function Workspace({
  blocks,
  blocksActions,
  code,
  simulator,
  simulatorActions,
  console,
}: WorkspaceProps) {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const preview = useSettingsStore((state) => state.preview);
  const update = useSettingsStore((state) => state.update);

  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const editorsRef = useRef<HTMLDivElement>(null);

  const detached = useUiStore((state) => state.simulatorDetached);
  const { blocksVisible, codeVisible, consoleVisible } = settings;
  // A simulator in its own window frees the whole main window for the editors.
  const simulatorVisible = settings.simulatorVisible && !detached;
  const editorsVisible = blocksVisible || codeVisible;
  const mainVisible = editorsVisible || simulatorVisible;

  const blocksTitle = t('panels.blocks');
  const codeTitle = t('panels.code');
  const simulatorTitle = t('panels.simulator');
  const consoleTitle = t('panels.console');

  return (
    <div className="workspace" ref={rootRef} data-testid="workspace">
      {mainVisible ? (
        <div className="workspace__main" ref={mainRef}>
          {editorsVisible && (
            <div className="workspace__editors" ref={editorsRef}>
              {blocksVisible && (
                <Panel
                  id="blocks"
                  title={blocksTitle}
                  icon={<Blocks aria-hidden="true" size="1.1em" />}
                  actions={blocksActions}
                  style={codeVisible ? { flex: `0 0 ${percent(settings.editorSplit)}` } : undefined}
                  onClose={() => void update({ blocksVisible: false })}
                >
                  {blocks}
                </Panel>
              )}
              {blocksVisible && codeVisible && (
                <Splitter
                  orientation="vertical"
                  containerRef={editorsRef}
                  value={settings.editorSplit}
                  {...PANEL_LIMITS.editorSplit}
                  label={t('panels.resize', { panel: blocksTitle })}
                  testId="splitter-editors"
                  onChange={(editorSplit) => preview({ editorSplit })}
                  onCommit={(editorSplit) => void update({ editorSplit })}
                />
              )}
              {codeVisible && (
                <Panel
                  id="code"
                  title={codeTitle}
                  icon={<Code aria-hidden="true" size="1.1em" />}
                  onClose={() => void update({ codeVisible: false })}
                >
                  {code}
                </Panel>
              )}
            </div>
          )}

          {simulatorVisible && editorsVisible && (
            <Splitter
              orientation="vertical"
              containerRef={mainRef}
              value={settings.simulatorSize}
              {...PANEL_LIMITS.simulatorSize}
              controlsTrailingPanel
              label={t('panels.resize', { panel: simulatorTitle })}
              testId="splitter-simulator"
              onChange={(simulatorSize) => preview({ simulatorSize })}
              onCommit={(simulatorSize) => void update({ simulatorSize })}
            />
          )}
          {simulatorVisible && (
            <Panel
              id="simulator"
              title={simulatorTitle}
              icon={<Cpu aria-hidden="true" size="1.1em" />}
              actions={simulatorActions}
              style={
                editorsVisible ? { flex: `0 0 ${percent(settings.simulatorSize)}` } : undefined
              }
              onClose={() => void update({ simulatorVisible: false })}
            >
              {simulator}
            </Panel>
          )}
        </div>
      ) : (
        <EmptyWorkspace />
      )}

      {consoleVisible && (
        <>
          <Splitter
            orientation="horizontal"
            containerRef={rootRef}
            value={settings.consoleSize}
            {...PANEL_LIMITS.consoleSize}
            controlsTrailingPanel
            label={t('panels.resize', { panel: consoleTitle })}
            testId="splitter-console"
            onChange={(consoleSize) => preview({ consoleSize })}
            onCommit={(consoleSize) => void update({ consoleSize })}
          />
          <Panel
            id="console"
            title={consoleTitle}
            icon={<Terminal aria-hidden="true" size="1.1em" />}
            style={mainVisible ? { flex: `0 0 ${percent(settings.consoleSize)}` } : undefined}
            onClose={() => void update({ consoleVisible: false })}
          >
            {console}
          </Panel>
        </>
      )}
    </div>
  );
}

function EmptyWorkspace() {
  const { t } = useTranslation();
  const update = useSettingsStore((state) => state.update);
  return (
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
  );
}
