import { explain } from '@ideblock/compiler';
import { getBoard } from '@ideblock/boards';
import { CircleCheck, CircleX, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBuildStore } from '../state/build';
import { useProjectStore } from '../state/project';
import { useSettingsStore } from '../state/settings';

function percent(used: number, max: number): number {
  return max > 0 ? Math.round((used / max) * 100) : 0;
}

export function BuildMessages() {
  const { t } = useTranslation();
  const status = useBuildStore((state) => state.status);
  const progress = useBuildStore((state) => state.progress);
  const result = useBuildStore((state) => state.result);
  const boardId = useProjectStore((state) => state.boardId);
  const revealLine = useProjectStore((state) => state.revealLine);
  const update = useSettingsStore((state) => state.update);

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
        <RawOutput output={result.output} />
      </div>
    );
  }

  const errors = result.diagnostics.filter((item) => item.severity === 'error');
  return (
    <div className="build-result" data-testid="build-errors">
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
      <RawOutput output={result.output} />
    </div>
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
