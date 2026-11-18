import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { matchShortcut, type ShortcutId } from '../shortcuts';
import { ConfirmReplaceDialog } from './ConfirmReplaceDialog';
import { ExamplesDialog } from './ExamplesDialog';
import { MessageDialog } from './MessageDialog';
import { RecentDialog } from './RecentDialog';
import { useProjectActions } from './useProjectActions';

export interface ProjectCommands {
  newProject: () => void;
  open: () => void;
  save: () => Promise<boolean>;
  saveAs: () => Promise<boolean>;
  exportSketch: () => Promise<void>;
  showExamples: () => void;
  showRecent: () => void;
}

const ProjectCommandsContext = createContext<ProjectCommands | null>(null);

export function useProjectCommands(): ProjectCommands {
  const commands = useContext(ProjectCommandsContext);
  if (!commands) throw new Error('Project commands are not provided');
  return commands;
}

/** File commands shared by the menu, the side rail and keyboard shortcuts. */
export function ProjectCommandsProvider({ children }: { children: ReactNode }) {
  const actions = useProjectActions();
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const { newProject, open, save, saveAs, exportSketch, openExample, openPath } = actions;

  const commands = useMemo<ProjectCommands>(
    () => ({
      newProject,
      open,
      save,
      saveAs,
      exportSketch,
      showExamples: () => setExamplesOpen(true),
      showRecent: () => setRecentOpen(true),
    }),
    [newProject, open, save, saveAs, exportSketch],
  );

  useEffect(() => {
    const handlers: Partial<Record<ShortcutId, () => void>> = {
      newProject,
      openProject: open,
      saveProject: () => void save(),
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      const shortcut = matchShortcut(event);
      const handler = shortcut ? handlers[shortcut] : undefined;
      if (handler) {
        event.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [newProject, open, save]);

  return (
    <ProjectCommandsContext.Provider value={commands}>
      {children}
      <ExamplesDialog
        open={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        onChoose={(id) => {
          setExamplesOpen(false);
          openExample(id);
        }}
      />
      <RecentDialog
        open={recentOpen}
        onClose={() => setRecentOpen(false)}
        onChoose={(path) => {
          setRecentOpen(false);
          openPath(path);
        }}
        onBrowse={() => {
          setRecentOpen(false);
          open();
        }}
      />
      <ConfirmReplaceDialog
        open={actions.confirmOpen}
        onChoose={(choice) => void actions.resolvePending(choice)}
      />
      <MessageDialog message={actions.message} onClose={actions.clearMessage} />
    </ProjectCommandsContext.Provider>
  );
}
