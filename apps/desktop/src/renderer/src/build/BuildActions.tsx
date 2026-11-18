import { Check } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useShortcutHint } from '../hooks/useShortcutHint';
import { matchShortcut } from '../shortcuts';
import { useBuildStore } from '../state/build';
import { useSettingsStore } from '../state/settings';

/** Shows the console when there is something the user needs to see. */
async function compileAndReport(): Promise<void> {
  const result = await useBuildStore.getState().compile();
  if (result && !result.ok) {
    await useSettingsStore.getState().update({ consoleVisible: true });
  }
}

export function BuildActions() {
  const { t } = useTranslation();
  const hint = useShortcutHint();
  const working = useBuildStore((state) => state.status === 'working');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (matchShortcut(event) === 'verify') {
        event.preventDefault();
        void compileAndReport();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="toolbar__group" role="group" aria-label={t('build.group')}>
      <button
        type="button"
        className="action-button"
        data-testid="build-verify"
        disabled={working}
        title={hint(t('build.verifyHint'), 'verify')}
        onClick={() => void compileAndReport()}
      >
        <Check aria-hidden="true" size="1.2em" />
        <span>{t('build.verify')}</span>
      </button>
    </div>
  );
}
