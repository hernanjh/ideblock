import { useEffect } from 'react';
import { toDocument, useProjectStore } from '../state/project';

const AUTOSAVE_DELAY_MS = 800;

/**
 * Saves the project folder shortly after each change, and always keeps the
 * session so an unsaved project survives closing the app.
 */
export function useAutosave(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const save = async (): Promise<void> => {
      const state = useProjectStore.getState();
      const revision = state.revision;
      const document = toDocument(state);
      await window.ideblock.invoke('session:save', { project: document, path: state.path });
      if (!state.path) {
        state.markSaved(revision, null);
        return;
      }
      state.setSaveStatus('saving');
      const result = await window.ideblock.invoke('project:save', document, state.path);
      if (result.ok) {
        useProjectStore.getState().markSaved(revision, result.value);
      } else {
        useProjectStore.getState().setSaveStatus('error');
      }
    };

    const unsubscribe = useProjectStore.subscribe((state, previous) => {
      const edited = state.revision !== previous.revision || state.loadId !== previous.loadId;
      // The generated sketch is saved with the project, so it waits for regeneration too.
      const regenerated =
        state.sketch !== previous.sketch && state.revision !== state.savedRevision;
      if (!edited && !regenerated) return;
      clearTimeout(timer);
      timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}
