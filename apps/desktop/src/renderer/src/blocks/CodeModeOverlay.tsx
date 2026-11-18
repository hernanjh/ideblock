import { Blocks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../state/project';

/** Covers the block editor while the project is edited as code. */
export function CodeModeOverlay() {
  const { t } = useTranslation();
  const mode = useProjectStore((state) => state.mode);
  const unchanged = useProjectStore(
    (state) => state.codeAtSwitch !== null && state.code === state.codeAtSwitch,
  );
  const switchToBlocks = useProjectStore((state) => state.switchToBlocks);

  if (mode !== 'code') return null;

  return (
    <div className="overlay" data-testid="code-mode-overlay">
      <div className="overlay__card" role="status">
        <strong>{t('blocks.codeModeTitle')}</strong>
        <p>{t('blocks.codeModeBody')}</p>
        {unchanged ? (
          <button type="button" data-testid="switch-to-blocks" onClick={() => switchToBlocks()}>
            <Blocks aria-hidden="true" size="1.1em" />
            {t('blocks.backToBlocks')}
          </button>
        ) : (
          <p className="overlay__hint">{t('blocks.backToBlocksUnavailable')}</p>
        )}
      </div>
    </div>
  );
}
