import { getBoard } from '@ideblock/boards';
import { Blocks, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../state/project';
import { convertCode, type ConversionResult } from './code-to-blocks';

type Conversion =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'ready'; result: ConversionResult }
  | { status: 'failed' };

/** Covers the block editor while the project is edited as code. */
export function CodeModeOverlay() {
  const { t } = useTranslation();
  const mode = useProjectStore((state) => state.mode);
  const unchanged = useProjectStore((state) => state.code === (state.sketch?.code ?? ''));
  const switchToBlocks = useProjectStore((state) => state.switchToBlocks);
  const [conversion, setConversion] = useState<Conversion>({ status: 'idle' });

  if (mode !== 'code') return null;

  const convert = async (): Promise<void> => {
    setConversion({ status: 'working' });
    const { code, boardId, circuit } = useProjectStore.getState();
    try {
      const result = await convertCode(code, getBoard(boardId), circuit);
      setConversion({ status: 'ready', result });
    } catch {
      setConversion({ status: 'failed' });
    }
  };

  const apply = (result: ConversionResult): void => {
    useProjectStore.getState().applyConvertedBlocks(result.state);
    setConversion({ status: 'idle' });
  };

  if (conversion.status === 'ready') {
    const { result } = conversion;
    return (
      <div className="overlay" data-testid="code-mode-overlay">
        <div className="overlay__card" role="dialog" aria-labelledby="conversion-title">
          <strong id="conversion-title">{t('blocks.convertedTitle')}</strong>
          <p data-testid="conversion-summary">
            {result.codeBlocks > 0
              ? t('blocks.convertedPartly', { count: result.blocks, code: result.codeBlocks })
              : t('blocks.convertedFully', { count: result.blocks })}
          </p>
          {result.syntaxError && (
            <p className="overlay__warning">{t('blocks.convertSyntaxError')}</p>
          )}
          <p className="overlay__hint">{t('blocks.convertReplaces')}</p>
          <div className="notice__actions">
            <button type="button" onClick={() => setConversion({ status: 'idle' })}>
              {t('blocks.convertCancel')}
            </button>
            <button
              type="button"
              className="button--primary"
              data-testid="apply-conversion"
              onClick={() => apply(result)}
            >
              <Blocks aria-hidden="true" size="1.1em" />
              {t('blocks.convertApply')}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <>
            <p className="overlay__hint">{t('blocks.convertHint')}</p>
            <button
              type="button"
              data-testid="convert-to-blocks"
              disabled={conversion.status === 'working'}
              onClick={() => void convert()}
            >
              <Wand2 aria-hidden="true" size="1.1em" />
              {conversion.status === 'working'
                ? t('blocks.converting')
                : t('blocks.convertToBlocks')}
            </button>
            {conversion.status === 'failed' && (
              <p className="overlay__warning" role="alert">
                {t('blocks.convertFailed')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
