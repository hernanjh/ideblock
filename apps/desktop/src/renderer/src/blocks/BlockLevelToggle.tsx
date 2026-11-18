import { ListPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../state/settings';

export function BlockLevelToggle() {
  const { t } = useTranslation();
  const blockLevel = useSettingsStore((state) => state.settings.blockLevel);
  const update = useSettingsStore((state) => state.update);
  const advanced = blockLevel === 'advanced';

  return (
    <button
      type="button"
      className="toggle-button toggle-button--small"
      aria-pressed={advanced}
      title={t('blocks.allBlocksHint')}
      data-testid="toggle-block-level"
      onClick={() => void update({ blockLevel: advanced ? 'beginner' : 'advanced' })}
    >
      <ListPlus aria-hidden="true" size="1.1em" />
      <span>{t('blocks.allBlocks')}</span>
    </button>
  );
}
