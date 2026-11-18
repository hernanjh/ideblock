import type * as monaco from 'monaco-editor/editor/editor.api';
import { PencilLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentAppearance } from '../blocks/theme';
import { currentCode, useProjectStore } from '../state/project';
import { useSettingsStore } from '../state/settings';
import { monacoTheme, setupMonaco } from './monaco';

const BASE_FONT_SIZE = 14;

export function CodeEditor() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [showLockedHint, setShowLockedHint] = useState(false);

  const mode = useProjectStore((state) => state.mode);
  const code = useProjectStore(currentCode);
  const diagnostics = useProjectStore((state) => state.diagnostics);
  const switchToCode = useProjectStore((state) => state.switchToCode);
  const theme = useSettingsStore((state) => state.settings.theme);
  const fontScale = useSettingsStore((state) => state.settings.fontScale);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const api = setupMonaco();
    const { settings } = useSettingsStore.getState();
    const project = useProjectStore.getState();

    const editor = api.editor.create(container, {
      value: currentCode(project),
      language: 'cpp',
      theme: monacoTheme(currentAppearance(settings.theme)),
      fontSize: Math.round(BASE_FONT_SIZE * settings.fontScale),
      readOnly: project.mode === 'blocks',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2,
      wordWrap: 'off',
      renderLineHighlight: 'line',
      fixedOverflowWidgets: true,
    });
    editorRef.current = editor;

    const edits = editor.onDidChangeModelContent(() => {
      const state = useProjectStore.getState();
      if (state.mode === 'code') state.setCode(editor.getValue());
    });
    const blockedEdits = editor.onDidAttemptReadOnlyEdit(() => setShowLockedHint(true));

    return () => {
      edits.dispose();
      blockedEdits.dispose();
      editor.getModel()?.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getValue() !== code) {
      // Keeps the cursor and scroll position when the generated code changes.
      const position = editor.getPosition();
      const scrollTop = editor.getScrollTop();
      editor.setValue(code);
      if (position) editor.setPosition(position);
      editor.setScrollTop(scrollTop);
    }
  }, [code]);

  useEffect(() => {
    editorRef.current?.updateOptions({
      readOnly: mode === 'blocks',
      // Replaces Monaco's built-in English message; the notice explains more.
      readOnlyMessage: { value: t('code.lockedTitle') },
    });
  }, [mode, t]);

  useEffect(() => {
    const api = setupMonaco();
    api.editor.setTheme(monacoTheme(currentAppearance(theme)));
    editorRef.current?.updateOptions({ fontSize: Math.round(BASE_FONT_SIZE * fontScale) });
  }, [theme, fontScale]);

  useEffect(() => {
    const api = setupMonaco();
    const model = editorRef.current?.getModel();
    if (!model) return;
    api.editor.setModelMarkers(
      model,
      'compiler',
      diagnostics.map((diagnostic) => ({
        startLineNumber: diagnostic.line,
        endLineNumber: diagnostic.line,
        startColumn: diagnostic.column,
        endColumn: model.getLineMaxColumn(Math.min(diagnostic.line, model.getLineCount())),
        message: diagnostic.message,
        severity:
          diagnostic.severity === 'error' ? api.MarkerSeverity.Error : api.MarkerSeverity.Warning,
      })),
    );
  }, [diagnostics, code]);

  return (
    <div className="code-editor">
      {showLockedHint && mode === 'blocks' && (
        <div className="notice" role="status" data-testid="code-locked-notice">
          <div>
            <strong>{t('code.lockedTitle')}</strong>
            <p>{t('code.lockedBody')}</p>
          </div>
          <div className="notice__actions">
            <button type="button" onClick={() => setShowLockedHint(false)}>
              {t('code.keepBlocks')}
            </button>
            <button
              type="button"
              className="button--primary"
              data-testid="switch-to-code"
              onClick={() => {
                setShowLockedHint(false);
                switchToCode();
              }}
            >
              <PencilLine aria-hidden="true" size="1.1em" />
              {t('code.switchToCode')}
            </button>
          </div>
        </div>
      )}
      <div ref={containerRef} className="code-editor__host" data-testid="code-editor" />
    </div>
  );
}
