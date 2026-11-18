import { PANEL_LIMITS } from '@ideblock/shared';
import { Blocks, Code, Cpu, Terminal } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../state/settings';
import { Panel } from './Panel';
import { Splitter } from './Splitter';

interface WorkspaceProps {
  blocks: ReactNode;
  blocksActions?: ReactNode;
  code: ReactNode;
  simulator: ReactNode;
  console: ReactNode;
}

const percent = (fraction: number): string => `${fraction * 100}%`;

export function Workspace({ blocks, blocksActions, code, simulator, console }: WorkspaceProps) {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const preview = useSettingsStore((state) => state.preview);
  const update = useSettingsStore((state) => state.update);

  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const editorsRef = useRef<HTMLDivElement>(null);

  const { editorView, simulatorVisible, consoleVisible } = settings;
  const showBlocks = editorView !== 'code';
  const showCode = editorView !== 'blocks';

  const blocksTitle = t('panels.blocks');
  const codeTitle = t('panels.code');
  const simulatorTitle = t('panels.simulator');
  const consoleTitle = t('panels.console');

  return (
    <div className="workspace" ref={rootRef} data-testid="workspace" data-view={editorView}>
      <div className="workspace__main" ref={mainRef}>
        <div className="workspace__editors" ref={editorsRef}>
          {showBlocks && (
            <Panel
              id="blocks"
              title={blocksTitle}
              icon={<Blocks aria-hidden="true" size="1.1em" />}
              actions={blocksActions}
              style={showCode ? { flex: `0 0 ${percent(settings.editorSplit)}` } : undefined}
            >
              {blocks}
            </Panel>
          )}
          {showBlocks && showCode && (
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
          {showCode && (
            <Panel id="code" title={codeTitle} icon={<Code aria-hidden="true" size="1.1em" />}>
              {code}
            </Panel>
          )}
        </div>

        {simulatorVisible && (
          <>
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
            <Panel
              id="simulator"
              title={simulatorTitle}
              icon={<Cpu aria-hidden="true" size="1.1em" />}
              style={{ flex: `0 0 ${percent(settings.simulatorSize)}` }}
              onClose={() => void update({ simulatorVisible: false })}
            >
              {simulator}
            </Panel>
          </>
        )}
      </div>

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
            style={{ flex: `0 0 ${percent(settings.consoleSize)}` }}
            onClose={() => void update({ consoleVisible: false })}
          >
            {console}
          </Panel>
        </>
      )}
    </div>
  );
}
