import { Puzzle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProjectCommands } from '../files/ProjectCommands';
import { formatShortcut, type ShortcutId } from '../shortcuts';
import { useSettingsStore } from '../state/settings';
import { useUiStore } from '../state/ui';
import { Menu, type MenuEntry } from './Menu';

export function AppHeader() {
  const { t } = useTranslation();
  const commands = useProjectCommands();
  const settings = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);
  const changeFontScale = useSettingsStore((state) => state.changeFontScale);
  const platform = useSettingsStore((state) => state.appInfo?.platform);
  const detached = useUiStore((state) => state.simulatorDetached);
  const openDialog = useUiStore((state) => state.openDialog);
  const keys = (id: ShortcutId) => formatShortcut(id, platform);

  const file: MenuEntry[] = [
    {
      id: 'new',
      label: t('files.new'),
      shortcut: keys('newProject'),
      onSelect: commands.newProject,
    },
    {
      id: 'open',
      label: t('files.openMenu'),
      shortcut: keys('openProject'),
      onSelect: commands.open,
    },
    { id: 'recent', label: t('files.recentMenu'), onSelect: commands.showRecent },
    { id: 'examples', label: t('files.examplesMenu'), onSelect: commands.showExamples },
    'separator',
    {
      id: 'save',
      label: t('files.save'),
      shortcut: keys('saveProject'),
      onSelect: () => void commands.save(),
    },
    { id: 'save-as', label: t('files.saveAsMenu'), onSelect: () => void commands.saveAs() },
    { id: 'export', label: t('files.exportMenu'), onSelect: () => void commands.exportSketch() },
    'separator',
    { id: 'boards', label: t('boards.menu'), onSelect: () => openDialog('boards') },
  ];

  const view: MenuEntry[] = [
    {
      id: 'blocks',
      label: t('panels.blocks'),
      shortcut: keys('toggleBlocks'),
      checked: settings.blocksVisible,
      onSelect: () => void update({ blocksVisible: !settings.blocksVisible }),
    },
    {
      id: 'code',
      label: t('panels.code'),
      shortcut: keys('toggleCode'),
      checked: settings.codeVisible,
      onSelect: () => void update({ codeVisible: !settings.codeVisible }),
    },
    {
      id: 'simulator',
      label: t('panels.simulator'),
      shortcut: keys('toggleSimulator'),
      checked: settings.simulatorVisible,
      onSelect: () => void update({ simulatorVisible: !settings.simulatorVisible }),
    },
    {
      id: 'console',
      label: t('panels.console'),
      shortcut: keys('toggleConsole'),
      checked: settings.consoleVisible,
      onSelect: () => void update({ consoleVisible: !settings.consoleVisible }),
    },
    {
      id: 'graph',
      label: t('console.graph'),
      checked: settings.consoleGraphVisible,
      onSelect: () => void update({ consoleGraphVisible: !settings.consoleGraphVisible }),
    },
    {
      id: 'assembly',
      label: t('assembly.open'),
      onSelect: () => openDialog('assembly'),
    },
    'separator',
    {
      id: 'detach',
      label: detached ? t('simulator.attach') : t('simulator.detach'),
      onSelect: () =>
        void window.ideblock.invoke(detached ? 'simulator:attach' : 'simulator:detach'),
    },
    'separator',
    {
      id: 'font-up',
      label: t('settings.increaseFont'),
      shortcut: keys('fontIncrease'),
      onSelect: () => void changeFontScale(1),
    },
    {
      id: 'font-down',
      label: t('settings.decreaseFont'),
      shortcut: keys('fontDecrease'),
      onSelect: () => void changeFontScale(-1),
    },
  ];

  const help: MenuEntry[] = [
    { id: 'about', label: t('about.menu'), onSelect: () => openDialog('about') },
  ];

  return (
    <header className="app-header">
      <div className="app-header__logo">
        <span className="app-header__mark">
          <Puzzle aria-hidden="true" size="1.1em" />
        </span>
        {t('app.name')}
      </div>
      <nav className="app-header__menus" aria-label={t('menu.label')}>
        <Menu label={t('menu.file')} entries={file} testId="menu-file" />
        <Menu label={t('menu.view')} entries={view} testId="menu-view" />
        <Menu label={t('menu.help')} entries={help} testId="menu-help" />
      </nav>
    </header>
  );
}
