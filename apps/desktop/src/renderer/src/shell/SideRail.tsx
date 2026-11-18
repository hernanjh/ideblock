import { BookOpen, CircleHelp, Folder, Puzzle, Waypoints, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProjectCommands } from '../files/ProjectCommands';
import { useUiStore, type MainView } from '../state/ui';

interface RailButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  testId: string;
  onClick: () => void;
}

function RailButton({ icon: Icon, label, active = false, testId, onClick }: RailButtonProps) {
  return (
    <button
      type="button"
      className={active ? 'rail__button rail__button--active' : 'rail__button'}
      aria-current={active ? 'page' : undefined}
      data-testid={testId}
      onClick={onClick}
    >
      <Icon aria-hidden="true" size="1.6em" />
      <span>{label}</span>
    </button>
  );
}

export function SideRail() {
  const { t } = useTranslation();
  const view = useUiStore((state) => state.view);
  const setView = useUiStore((state) => state.setView);
  const commands = useProjectCommands();
  const openDialog = useUiStore((state) => state.openDialog);
  const show = (target: MainView) => () => setView(target);

  return (
    <nav className="rail" aria-label={t('rail.label')}>
      <RailButton
        icon={Puzzle}
        label={t('rail.program')}
        active={view === 'program'}
        testId="rail-program"
        onClick={show('program')}
      />
      <RailButton
        icon={Waypoints}
        label={t('rail.circuit')}
        active={view === 'circuit'}
        testId="rail-circuit"
        onClick={show('circuit')}
      />
      <RailButton
        icon={Folder}
        label={t('rail.projects')}
        testId="rail-projects"
        onClick={commands.showRecent}
      />
      <RailButton
        icon={BookOpen}
        label={t('rail.examples')}
        testId="file-examples"
        onClick={commands.showExamples}
      />
      <div className="rail__spacer" />
      <RailButton
        icon={CircleHelp}
        label={t('menu.help')}
        testId="rail-help"
        onClick={() => openDialog('about')}
      />
    </nav>
  );
}
