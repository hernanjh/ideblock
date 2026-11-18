import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../state/project';

export function SaveStatus() {
  const { t } = useTranslation();
  const path = useProjectStore((state) => state.path);
  const status = useProjectStore((state) => state.saveStatus);

  let text: string;
  if (status === 'error') text = t('files.status.error');
  else if (!path) text = t('files.status.notInFolder');
  else if (status === 'saving') text = t('files.status.saving');
  else text = t('files.status.saved', { path });

  return (
    <span
      data-testid="save-status"
      data-status={path ? status : 'unsaved'}
      title={path ?? undefined}
    >
      {text}
    </span>
  );
}
