import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../state/project';

export function ProjectName() {
  const { t } = useTranslation();
  const name = useProjectStore((state) => state.name);
  const setName = useProjectStore((state) => state.setName);

  return (
    <input
      className="project-name"
      data-testid="project-name"
      aria-label={t('files.projectName')}
      title={t('files.projectName')}
      value={name}
      maxLength={60}
      onChange={(event) => setName(event.target.value)}
    />
  );
}
