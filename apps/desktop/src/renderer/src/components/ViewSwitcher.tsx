import { EDITOR_VIEWS, type EditorView } from '@ideblock/shared';
import { Blocks, Code, Columns2 } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useShortcutHint } from '../hooks/useShortcutHint';
import type { ShortcutId } from '../shortcuts';
import { useSettingsStore } from '../state/settings';

const ICONS: Record<EditorView, typeof Blocks> = {
  blocks: Blocks,
  split: Columns2,
  code: Code,
};

const SHORTCUT_BY_VIEW: Record<EditorView, ShortcutId> = {
  blocks: 'viewBlocks',
  split: 'viewSplit',
  code: 'viewCode',
};

/** Radio group with roving focus, so arrow keys move between views. */
export function ViewSwitcher() {
  const { t } = useTranslation();
  const hint = useShortcutHint();
  const current = useSettingsStore((state) => state.settings.editorView);
  const update = useSettingsStore((state) => state.update);
  const buttons = useRef<Partial<Record<EditorView, HTMLButtonElement | null>>>({});

  const select = (view: EditorView, focus = false): void => {
    void update({ editorView: view });
    if (focus) buttons.current[view]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const index = EDITOR_VIEWS.indexOf(current);
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index - 1;
    if (next === null) return;
    event.preventDefault();
    const view = EDITOR_VIEWS[(next + EDITOR_VIEWS.length) % EDITOR_VIEWS.length];
    if (view) select(view, true);
  };

  return (
    <div
      className="segmented"
      role="radiogroup"
      aria-label={t('toolbar.view')}
      onKeyDown={onKeyDown}
    >
      {EDITOR_VIEWS.map((view) => {
        const Icon = ICONS[view];
        const label = t(`view.${view}`);
        const checked = view === current;
        return (
          <button
            key={view}
            ref={(element) => {
              buttons.current[view] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className="segmented__option"
            title={hint(label, SHORTCUT_BY_VIEW[view])}
            data-testid={`view-${view}`}
            onClick={() => select(view)}
          >
            <Icon aria-hidden="true" size="1.2em" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
