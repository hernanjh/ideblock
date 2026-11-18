import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BuildMessages } from './BuildMessages';

type ConsoleTab = 'messages' | 'serial';

interface ConsolePanelProps {
  serial?: ReactNode;
}

export function ConsolePanel({ serial }: ConsolePanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ConsoleTab>('messages');
  const tabs: ConsoleTab[] = serial ? ['messages', 'serial'] : ['messages'];

  return (
    <div className="console">
      <div className="tabs" role="tablist" aria-label={t('panels.console')}>
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`console-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`console-panel-${id}`}
            className="tabs__tab"
            data-testid={`console-tab-${id}`}
            onClick={() => setTab(id)}
          >
            {t(`console.${id}`)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`console-panel-${tab}`}
        aria-labelledby={`console-tab-${tab}`}
        className="console__body"
      >
        {tab === 'messages' ? <BuildMessages /> : serial}
      </div>
    </div>
  );
}
