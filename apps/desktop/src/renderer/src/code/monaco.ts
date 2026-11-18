import 'monaco-editor/features/register.all';
import 'monaco-editor/languages/definitions/cpp/register';
import * as monaco from 'monaco-editor/editor/editor.api';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { registerSketchCompletions } from './completions';

let configured = false;

/** Loads Monaco from the app bundle; nothing is fetched from a CDN. */
export function setupMonaco(): typeof monaco {
  if (!configured) {
    self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
    registerSketchCompletions(monaco);
    configured = true;
  }
  return monaco;
}

export function monacoTheme(appearance: 'light' | 'dark' | 'high-contrast'): string {
  switch (appearance) {
    case 'dark':
      return 'vs-dark';
    case 'high-contrast':
      return 'hc-black';
    default:
      return 'vs';
  }
}

export type Monaco = typeof monaco;
