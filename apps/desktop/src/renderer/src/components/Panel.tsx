import { useTranslation } from 'react-i18next';

interface PanelProps {
  id: string;
  title: string;
}

export function Panel({ id, title }: PanelProps) {
  const { t } = useTranslation();
  const headingId = `panel-${id}-title`;

  return (
    <section className="panel" aria-labelledby={headingId} data-testid={`panel-${id}`}>
      <h2 id={headingId} className="panel__title">
        {title}
      </h2>
      <p className="panel__placeholder">{t('panels.comingSoon')}</p>
    </section>
  );
}
