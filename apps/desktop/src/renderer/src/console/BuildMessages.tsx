import { explain, explainUploadError } from '@ideblock/compiler';
import { getBoard } from '@ideblock/boards';
import { CircleCheck, CircleX, LoaderCircle, TriangleAlert } from 'lucide-react';
import { NoBoardHelp } from '../ports/NoBoardHelp';
import { useTranslation } from 'react-i18next';
import { useBuildStore } from '../state/build';
import { useProjectStore } from '../state/project';
import { useSettingsStore } from '../state/settings';
import { useUiStore } from '../state/ui';

function percent(used: number, max: number): number {
  return max > 0 ? Math.round((used / max) * 100) : 0;
}

export function BuildMessages() {
  const { t } = useTranslation();
  const status = useBuildStore((state) => state.status);
  const progress = useBuildStore((state) => state.progress);
  const result = useBuildStore((state) => state.result);
  const action = useBuildStore((state) => state.action);
  const upload = useBuildStore((state) => state.upload);
  const noBoard = useBuildStore((state) => state.noBoard);
  const boardId = useProjectStore((state) => state.boardId);

  if (noBoard && status !== 'working') return <NoBoardHelp />;

  if (status === 'idle' || (!result && status !== 'working')) {
    return <p className="console__empty">{t('build.idle')}</p>;
  }

  if (status === 'working') {
    const stage = progress?.stage ?? 'compile';
    return (
      <div className="build-status" role="status" data-testid="build-working">
        <LoaderCircle aria-hidden="true" className="spin" size="1.2em" />
        <div>
          <p>
            {t(`build.stage.${stage}`, {
              board: getBoard(boardId).name,
              subject: progress?.subject ?? '',
            })}
          </p>
          {progress?.detail && stage !== 'compile' && (
            <p className="build-status__detail">{progress.detail}</p>
          )}
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (action === 'upload' && upload && result.ok) {
    if (upload.ok) {
      return (
        <div className="build-result" data-testid="upload-success">
          <p className="build-result__title build-result__title--ok">
            <CircleCheck aria-hidden="true" size="1.2em" />
            {t('build.uploaded')}
          </p>
          <RawOutput output={upload.output} />
        </div>
      );
    }
    const help = explainUploadError(upload.output);
    return (
      <div className="build-result" data-testid="upload-failure">
        <p className="build-result__title build-result__title--error">
          <CircleX aria-hidden="true" size="1.2em" />
          {t('build.uploadFailed')}
        </p>
        <p>{help ? t(`uploadHelp.${help}` as never) : t('build.uploadFailedGeneric')}</p>
        <RawOutput output={upload.output} />
      </div>
    );
  }

  if (result.ok) {
    const warnings = result.diagnostics.filter((item) => item.severity === 'warning');
    return (
      <div className="build-result" data-testid="build-success">
        <p className="build-result__title build-result__title--ok">
          <CircleCheck aria-hidden="true" size="1.2em" />
          {t('build.success')}
        </p>
        {result.program && (
          <p>
            {t('build.memory', {
              used: result.program.used,
              max: result.program.max,
              percent: percent(result.program.used, result.program.max),
            })}
          </p>
        )}
        {warnings.length > 0 && <p>{t('build.warnings', { count: warnings.length })}</p>}
        <RawOutput output={result.output} />
      </div>
    );
  }

  if (result.failure && result.failure !== 'compile') {
    return (
      <div className="build-result" data-testid="build-failure">
        <p className="build-result__title build-result__title--error">
          <CircleX aria-hidden="true" size="1.2em" />
          {t(`build.failure.${result.failure}`)}
        </p>
        {(result.failure === 'core-install' || result.failure === 'library-install') && (
          <button
            type="button"
            className="button--small"
            data-testid="open-boards"
            onClick={() => useUiStore.getState().openDialog('boards')}
          >
            {t('boards.offlineHelp')}
          </button>
        )}
        <RawOutput output={result.output} />
      </div>
    );
  }

  return (
    <div className="build-result" data-testid="build-errors">
      <DiagnosticsList />
      <RawOutput output={result.output} />
    </div>
  );
}

/** Compiler errors with plain-language help and links to their lines. */
export function DiagnosticsList() {
  const { t } = useTranslation();
  const result = useBuildStore((state) => state.result);
  const revealLine = useProjectStore((state) => state.revealLine);
  const update = useSettingsStore((state) => state.update);
  const errors = result?.diagnostics.filter((item) => item.severity === 'error') ?? [];

  if (!result || result.ok) {
    return <p className="console__empty">{t('build.noErrors')}</p>;
  }

  return (
    <>
      <p className="build-result__title build-result__title--error">
        <CircleX aria-hidden="true" size="1.2em" />
        {t('build.errors', { count: Math.max(errors.length, 1) })}
      </p>
      <ul className="diagnostics">
        {errors.map((diagnostic, index) => {
          const explanation = explain(diagnostic);
          const canJump = diagnostic.inSketch && diagnostic.line > 0;
          return (
            <li key={index} className="diagnostic">
              <TriangleAlert aria-hidden="true" size="1.1em" className="diagnostic__icon" />
              <div>
                {explanation && (
                  <p className="diagnostic__help">
                    {t(`compilerHelp.${explanation.key}` as never, explanation.values)}
                  </p>
                )}
                <p className="diagnostic__message">
                  {canJump ? (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => {
                        void update({ codeVisible: true });
                        revealLine(diagnostic.line, diagnostic.column);
                      }}
                    >
                      {t('build.line', { line: diagnostic.line })}
                    </button>
                  ) : (
                    <span>{diagnostic.file}</span>
                  )}{' '}
                  <code>{diagnostic.message}</code>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function RawOutput({ output }: { output: string }) {
  const { t } = useTranslation();
  if (!output.trim()) return null;
  return (
    <details className="raw-output">
      <summary>{t('build.details')}</summary>
      <pre>{output}</pre>
    </details>
  );
}
