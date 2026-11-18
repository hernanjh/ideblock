import { ChevronDown, CircleCheck, Terminal, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuildStore } from '../state/build';
import { useSettingsStore } from '../state/settings';
import { BuildMessages, DiagnosticsList } from './BuildMessages';

type ConsoleTab = 'messages' | 'serial' | 'errors';

const ICONS: Record<ConsoleTab, LucideIcon> = {
  messages: CircleCheck,
  serial: Terminal,
  errors: TriangleAlert,
};

interface ConsolePanelProps {
  serial: ReactNode;
}

export function ConsolePanel({ serial }: ConsolePanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ConsoleTab>('messages');
  const update = useSettingsStore((state) => state.update);
  const errorCount = useBuildStore((state) =>
    state.result && !state.result.ok
      ? Math.max(1, state.result.diagnostics.filter((item) => item.severity === 'error').length)
      : 0,
  );
  const tabs: ConsoleTab[] = ['messages', 'serial', 'errors'];

  return (
    <section className="card console" data-testid="panel-console" aria-label={t('panels.console')}>
      <div className="card__header">
        <div className="tabs" role="tablist" aria-label={t('panels.console')}>
          {tabs.map((id) => {
            const Icon = ICONS[id];
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`console-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`console-panel-${id}`}
                className="tab"
                data-testid={`console-tab-${id}`}
                onClick={() => setTab(id)}
              >
                <Icon aria-hidden="true" size="1.1em" />
                {t(`console.${id}`)}
                {id === 'errors' && (
                  <span className={errorCount > 0 ? 'count count--alert' : 'count'}>
                    {errorCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="icon-button icon-button--framed card__end"
          aria-label={t('panels.hide', { panel: t('panels.console') })}
          title={t('panels.hide', { panel: t('panels.console') })}
          data-testid="panel-console-close"
          onClick={() => void update({ consoleVisible: false })}
        >
          <ChevronDown aria-hidden="true" size="1.1em" />
        </button>
      </div>
      <div
        role="tabpanel"
        id={`console-panel-${tab}`}
        aria-labelledby={`console-tab-${tab}`}
        className="console__body"
      >
        {tab === 'messages' && <BuildMessages />}
        {tab === 'serial' && serial}
        {tab === 'errors' && (
          <div className="build-result" data-testid="console-errors">
            <DiagnosticsList />
          </div>
        )}
      </div>
    </section>
  );
}
