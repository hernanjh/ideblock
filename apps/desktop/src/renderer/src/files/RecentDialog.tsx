import type { RecentProject } from '@ideblock/shared';
import { Folder, FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../components/Modal';

interface RecentDialogProps {
  open: boolean;
  onClose: () => void;
  onChoose: (path: string) => void;
  onBrowse: () => void;
}

export function RecentDialog({ open, onClose, onChoose, onBrowse }: RecentDialogProps) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    if (open) void window.ideblock.invoke('project:recent').then(setProjects);
  }, [open]);

  return (
    <Modal
      open={open}
      title={t('files.recentTitle')}
      onClose={onClose}
      testId="recent-dialog"
      wide
      footer={
        <button type="button" className="button--primary" onClick={onBrowse}>
          <FolderOpen aria-hidden="true" size="1.1em" />
          {t('files.browse')}
        </button>
      }
    >
      {projects.length === 0 ? (
        <p>{t('files.noRecent')}</p>
      ) : (
        <ul className="recent-list">
          {projects.map((project) => (
            <li key={project.path}>
              <button type="button" className="example-card" onClick={() => onChoose(project.path)}>
                <strong>
                  <Folder aria-hidden="true" size="1em" /> {project.name}
                </strong>
                <span>{project.path}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
