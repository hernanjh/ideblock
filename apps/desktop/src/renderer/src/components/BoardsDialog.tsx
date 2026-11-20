import { getBoard } from '@ideblock/boards';
import type { BoardsResult, BoardsStatus, CoreStatus } from '@ideblock/shared';
import { Check, Download, FolderInput, FolderOutput, LoaderCircle, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuildStore } from '../state/build';
import { Modal } from './Modal';

type Message = { kind: 'ok' | 'error'; text: string } | null;

/** Board packages and libraries: install them before a class, or move them without internet. */
export function BoardsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} title={t('boards.title')} onClose={onClose} testId="boards-dialog" wide>
      <BoardsContent />
    </Modal>
  );
}

/** Mounted each time the dialog opens, so it starts from a fresh status. */
function BoardsContent() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<BoardsStatus | null>(null);
  const [busy, setBusy] = useState<string | null>('status');
  const [message, setMessage] = useState<Message>(null);
  const progress = useBuildStore((state) => state.progress);

  const refresh = useCallback(async () => {
    try {
      setStatus(await window.ideblock.invoke('boards:status'));
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (
    id: string,
    action: () => Promise<BoardsResult | null>,
    success: string,
  ): Promise<void> => {
    setBusy(id);
    setMessage(null);
    try {
      const result = await action();
      if (!result) return;
      setMessage(
        result.ok
          ? { kind: 'ok', text: success }
          : {
              kind: 'error',
              text: t(`boards.failure.${result.failure}`, { detail: result.detail ?? '' }),
            },
      );
    } finally {
      setBusy('status');
      await refresh();
    }
  };

  const dialogTexts = (title: string) => ({ title, filterName: '' });
  const working = busy !== null;

  return (
    <>
      <p>{t('boards.intro')}</p>
      {status && !status.online && <p className="notice">{t('boards.offline')}</p>}

      <h3 className="boards__heading">{t('boards.cores')}</h3>
      {!status && <p className="boards__loading">{t('boards.loading')}</p>}
      <ul className="boards__list">
        {status?.cores.map((core) => (
          <CoreRow
            key={core.id}
            core={core}
            busy={busy}
            onInstall={() =>
              void act(
                core.id,
                () => window.ideblock.invoke('boards:install-core', core.id),
                t('boards.installed'),
              )
            }
            onRemove={() =>
              void act(
                core.id,
                () => window.ideblock.invoke('boards:remove-core', core.id),
                t('boards.removed'),
              )
            }
          />
        ))}
      </ul>

      <h3 className="boards__heading">{t('boards.libraries')}</h3>
      <p className="boards__hint">{t('boards.librariesHint')}</p>
      <ul className="boards__libraries" data-testid="boards-libraries">
        {status?.libraries.map((library) => (
          <li key={library.name}>
            {library.installed ? (
              <Check aria-hidden="true" size="1em" className="boards__ok" />
            ) : (
              <span className="boards__dot" aria-hidden="true" />
            )}
            {library.name}
            <span className="boards__version">{library.installed ?? t('boards.notInstalled')}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={working || !status || status.libraries.every((library) => library.installed)}
        data-testid="boards-install-libraries"
        onClick={() =>
          void act(
            'libraries',
            () => window.ideblock.invoke('boards:install-libraries'),
            t('boards.librariesInstalled'),
          )
        }
      >
        <Download aria-hidden="true" size="1em" />
        {t('boards.installLibraries')}
      </button>

      <h3 className="boards__heading">{t('boards.pack')}</h3>
      <p className="boards__hint">{t('boards.packHint')}</p>
      <div className="notice__actions boards__pack">
        <button
          type="button"
          disabled={working}
          data-testid="boards-export"
          onClick={() =>
            void act(
              'export',
              () =>
                window.ideblock.invoke('boards:export-pack', dialogTexts(t('boards.exportTitle'))),
              t('boards.exported'),
            )
          }
        >
          <FolderOutput aria-hidden="true" size="1em" />
          {t('boards.export')}
        </button>
        <button
          type="button"
          disabled={working}
          data-testid="boards-import"
          onClick={() =>
            void act(
              'import',
              () =>
                window.ideblock.invoke('boards:import-pack', dialogTexts(t('boards.importTitle'))),
              t('boards.imported'),
            )
          }
        >
          <FolderInput aria-hidden="true" size="1em" />
          {t('boards.import')}
        </button>
      </div>

      {working && busy !== 'status' && (
        <p className="build-status boards__progress" role="status" data-testid="boards-progress">
          <LoaderCircle aria-hidden="true" className="spin" size="1.2em" />
          <span>
            {progress
              ? t(`build.stage.${progress.stage}`, {
                  board: progress.subject ?? '',
                  subject: progress.subject ?? '',
                })
              : t('boards.working')}
            {progress?.detail && <span className="build-status__detail"> {progress.detail}</span>}
          </span>
        </p>
      )}
      {message && (
        <p
          className={
            message.kind === 'ok' ? 'boards__message' : 'boards__message boards__message--error'
          }
          role={message.kind === 'ok' ? 'status' : 'alert'}
          data-testid="boards-message"
        >
          {message.text}
        </p>
      )}
    </>
  );
}

interface CoreRowProps {
  core: CoreStatus;
  busy: string | null;
  onInstall: () => void;
  onRemove: () => void;
}

function CoreRow({ core, busy, onInstall, onRemove }: CoreRowProps) {
  const { t } = useTranslation();
  const all = core.boards.map((id) => getBoard(id).name);
  // Variants such as "Arduino Nano (old bootloader)" go with their board.
  const names = all
    .filter((name) => {
      const base = name.replace(/\s*\(.*\)$/, '');
      return base === name || !all.includes(base);
    })
    .join(', ');
  const outdated =
    core.installed !== null && core.latest !== null && core.latest !== core.installed;
  return (
    <li className="boards__core" data-testid={`core-${core.id}`}>
      <div>
        <strong>{names}</strong>
        <span className="boards__version">
          {core.installed
            ? outdated
              ? t('boards.updateAvailable', { installed: core.installed, latest: core.latest })
              : t('boards.installedVersion', { version: core.installed })
            : t('boards.notInstalled')}
        </span>
      </div>
      <div className="notice__actions">
        {busy === core.id && <LoaderCircle aria-hidden="true" className="spin" size="1.2em" />}
        {(!core.installed || outdated) && (
          <button
            type="button"
            className="button--small button--primary"
            disabled={busy !== null}
            data-testid={`core-install-${core.id}`}
            onClick={onInstall}
          >
            <Download aria-hidden="true" size="1em" />
            {core.installed ? t('boards.update') : t('boards.install')}
          </button>
        )}
        {core.installed && (
          <button
            type="button"
            className="button--small"
            disabled={busy !== null}
            data-testid={`core-remove-${core.id}`}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" size="1em" />
            {t('boards.remove')}
          </button>
        )}
      </div>
    </li>
  );
}
