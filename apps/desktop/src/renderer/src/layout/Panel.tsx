import { X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface PanelProps {
  id: string;
  title: string;
  icon?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  onClose?: (() => void) | undefined;
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
}

export function Panel({ id, title, icon, actions, onClose, style, children }: PanelProps) {
  const { t } = useTranslation();
  const headingId = `panel-${id}-title`;

  return (
    <section
      className="panel"
      aria-labelledby={headingId}
      data-testid={`panel-${id}`}
      style={style}
    >
      <header className="panel__header">
        <h2 id={headingId} className="panel__title">
          {icon}
          <span>{title}</span>
        </h2>
        <div className="panel__actions">
          {actions}
          {onClose && (
            <button
              type="button"
              className="icon-button"
              aria-label={t('panels.close', { panel: title })}
              title={t('panels.close', { panel: title })}
              data-testid={`panel-${id}-close`}
              onClick={onClose}
            >
              <X aria-hidden="true" size="1.1em" />
            </button>
          )}
        </div>
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}
