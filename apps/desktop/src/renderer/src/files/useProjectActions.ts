import type { DialogTexts, ProjectErrorReason } from '@ideblock/shared';
import type { ProjectDocument } from '@ideblock/project';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toDocument, useProjectStore } from '../state/project';
import type { ReplaceChoice } from './ConfirmReplaceDialog';

type Replacement = () => Promise<void>;

/**
 * File commands shared by the toolbar and keyboard shortcuts. Replacing a
 * project that only lives in the session asks first, so work is never lost.
 */
export function useProjectActions() {
  const { t, i18n } = useTranslation();
  const [pending, setPending] = useState<Replacement | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const texts = (title: string, filterName: string): DialogTexts => ({ title, filterName });

  const reportError = useCallback(
    (reason: ProjectErrorReason) => setMessage(t(`files.errors.${reason}`)),
    [t],
  );

  const saveAs = useCallback(async (): Promise<boolean> => {
    const state = useProjectStore.getState();
    const result = await window.ideblock.invoke(
      'project:save-as',
      toDocument(state),
      texts(t('files.saveAsTitle'), t('files.projectFilter')),
    );
    if (!result) return false;
    if (!result.ok) {
      reportError(result.reason);
      return false;
    }
    useProjectStore.getState().markSaved(state.revision, result.value);
    return true;
  }, [t, reportError]);

  const save = useCallback(async (): Promise<boolean> => {
    const state = useProjectStore.getState();
    if (!state.path) return saveAs();
    const result = await window.ideblock.invoke('project:save', toDocument(state), state.path);
    if (!result.ok) {
      reportError(result.reason);
      return false;
    }
    useProjectStore.getState().markSaved(state.revision, result.value);
    return true;
  }, [saveAs, reportError]);

  /** Runs `replace` now, or after asking when the current project would be lost. */
  const guard = useCallback((replace: Replacement) => {
    const { path, edited } = useProjectStore.getState();
    if (path === null && edited) {
      setPending(() => replace);
    } else {
      void replace();
    }
  }, []);

  const resolvePending = useCallback(
    async (choice: ReplaceChoice) => {
      const replace = pending;
      setPending(null);
      if (!replace || choice === 'cancel') return;
      if (choice === 'save' && !(await saveAs())) return;
      await replace();
    },
    [pending, saveAs],
  );

  const loadDocument = (project: ProjectDocument, path: string | null): void =>
    useProjectStore.getState().load(project, path);

  const newProject = useCallback(
    () =>
      guard(async () => {
        useProjectStore.getState().newProject(t('files.untitled'));
      }),
    [guard, t],
  );

  const open = useCallback(
    () =>
      guard(async () => {
        const result = await window.ideblock.invoke(
          'project:open',
          texts(t('files.openTitle'), t('files.projectFilter')),
        );
        if (!result) return;
        if (!result.ok) return reportError(result.reason);
        loadDocument(result.value.project, result.value.path);
      }),
    [guard, t, reportError],
  );

  const openExample = useCallback(
    (id: string) =>
      guard(async () => {
        const result = await window.ideblock.invoke('project:load-example', id);
        if (!result.ok) return reportError(result.reason);
        // An opened example becomes the user's own project, named in their language.
        const { example, ...manifest } = result.value.manifest;
        const language = i18n.language === 'es' ? 'es' : 'en';
        const name = example?.title[language] ?? manifest.name;
        loadDocument({ ...result.value, manifest: { ...manifest, name } }, null);
      }),
    [guard, reportError, i18n],
  );

  const exportSketch = useCallback(async () => {
    const state = useProjectStore.getState();
    const document = toDocument(state);
    const result = await window.ideblock.invoke(
      'project:export-sketch',
      document.code,
      document.manifest.name,
      texts(t('files.exportTitle'), t('files.sketchFilter')),
    );
    if (result && !result.ok) reportError(result.reason);
  }, [t, reportError]);

  return {
    newProject,
    open,
    save,
    saveAs,
    openExample,
    exportSketch,
    confirmOpen: pending !== null,
    resolvePending,
    message,
    clearMessage: () => setMessage(null),
  };
}
