import { BookOpen, FileDown, FilePlus, FolderOpen, Save, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShortcutHint } from '../hooks/useShortcutHint';
import { matchShortcut, type ShortcutId } from '../shortcuts';
import { ConfirmReplaceDialog } from './ConfirmReplaceDialog';
import { ExamplesDialog } from './ExamplesDialog';
import { MessageDialog } from './MessageDialog';
import { useProjectActions } from './useProjectActions';

interface FileButtonProps {
  testId: string;
  label: string;
  icon: LucideIcon;
  shortcut?: ShortcutId;
  onClick: () => void;
}

function FileButton({ testId, label, icon: Icon, shortcut, onClick }: FileButtonProps) {
  const hint = useShortcutHint();
  return (
    <button
      type="button"
      className="icon-button icon-button--labelled"
      data-testid={testId}
      title={shortcut ? hint(label, shortcut) : label}
      onClick={onClick}
    >
      <Icon aria-hidden="true" size="1.2em" />
      <span>{label}</span>
    </button>
  );
}

export function FileActions() {
  const { t } = useTranslation();
  const actions = useProjectActions();
  const [examplesOpen, setExamplesOpen] = useState(false);
  const { newProject, open, save } = actions;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const shortcut = matchShortcut(event);
      const commands: Partial<Record<ShortcutId, () => void>> = {
        newProject,
        openProject: open,
        saveProject: () => void save(),
      };
      const command = shortcut ? commands[shortcut] : undefined;
      if (command) {
        event.preventDefault();
        command();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [newProject, open, save]);

  return (
    <div className="toolbar__group" role="group" aria-label={t('files.group')}>
      <FileButton
        testId="file-new"
        label={t('files.new')}
        icon={FilePlus}
        shortcut="newProject"
        onClick={newProject}
      />
      <FileButton
        testId="file-open"
        label={t('files.open')}
        icon={FolderOpen}
        shortcut="openProject"
        onClick={open}
      />
      <FileButton
        testId="file-save"
        label={t('files.save')}
        icon={Save}
        shortcut="saveProject"
        onClick={() => void save()}
      />
      <FileButton
        testId="file-examples"
        label={t('files.examples')}
        icon={BookOpen}
        onClick={() => setExamplesOpen(true)}
      />
      <FileButton
        testId="file-export"
        label={t('files.export')}
        icon={FileDown}
        onClick={() => void actions.exportSketch()}
      />

      <ExamplesDialog
        open={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        onChoose={(id) => {
          setExamplesOpen(false);
          actions.openExample(id);
        }}
      />
      <ConfirmReplaceDialog
        open={actions.confirmOpen}
        onChoose={(choice) => void actions.resolvePending(choice)}
      />
      <MessageDialog message={actions.message} onClose={actions.clearMessage} />
    </div>
  );
}
