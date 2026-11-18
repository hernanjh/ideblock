import { Check, Upload } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useShortcutHint } from '../hooks/useShortcutHint';
import { PortSelect } from '../ports/PortSelect';
import { matchShortcut } from '../shortcuts';
import { useBuildStore } from '../state/build';
import { usePortsStore } from '../state/ports';
import { useSettingsStore } from '../state/settings';

async function showConsoleIfFailed(ok: boolean | undefined): Promise<void> {
  if (ok === false) await useSettingsStore.getState().update({ consoleVisible: true });
}

async function verify(): Promise<void> {
  const result = await useBuildStore.getState().compile();
  await showConsoleIfFailed(result?.ok);
}

async function upload(): Promise<void> {
  const port = usePortsStore.getState().selected;
  const result = await useBuildStore.getState().uploadTo(port);
  await showConsoleIfFailed(result?.ok ?? false);
}

export function BuildActions() {
  const { t } = useTranslation();
  const hint = useShortcutHint();
  const working = useBuildStore((state) => state.status === 'working');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const shortcut = matchShortcut(event);
      if (shortcut === 'verify') {
        event.preventDefault();
        void verify();
      } else if (shortcut === 'upload') {
        event.preventDefault();
        void upload();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="toolbar__group" role="group" aria-label={t('build.group')}>
      <button
        type="button"
        className="action-button action-button--secondary"
        data-testid="build-verify"
        disabled={working}
        title={hint(t('build.verifyHint'), 'verify')}
        onClick={() => void verify()}
      >
        <Check aria-hidden="true" size="1.2em" />
        <span>{t('build.verify')}</span>
      </button>
      <PortSelect />
      <button
        type="button"
        className="action-button"
        data-testid="build-upload"
        disabled={working}
        title={hint(t('build.uploadHint'), 'upload')}
        onClick={() => void upload()}
      >
        <Upload aria-hidden="true" size="1.2em" />
        <span>{t('build.upload')}</span>
      </button>
    </div>
  );
}
