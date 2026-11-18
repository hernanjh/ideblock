import { useTranslation } from 'react-i18next';
import { Modal } from '../components/Modal';
import { useSettingsStore } from '../state/settings';

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const version = useSettingsStore((state) => state.appInfo?.version ?? '');
  return (
    <Modal open={open} title={t('about.title')} onClose={onClose} testId="about-dialog">
      <p>
        <strong>{t('app.name')}</strong> · {t('status.version', { version })}
      </p>
      <p>{t('about.description')}</p>
      <p>{t('about.license')}</p>
      <p className="about__trademark">{t('about.trademark')}</p>
    </Modal>
  );
}
