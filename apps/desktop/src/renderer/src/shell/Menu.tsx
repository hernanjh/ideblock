import { Check } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export type MenuEntry = MenuItem | 'separator';

interface MenuProps {
  label: string;
  entries: MenuEntry[];
  testId?: string;
}

/** Dropdown menu for the title bar, operable with the keyboard. */
export function Menu({ label, entries, testId }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    listRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
    const buttons = [
      ...(listRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []),
    ];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown') buttons[(index + 1) % buttons.length]?.focus();
    else if (event.key === 'ArrowUp')
      buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
    else if (event.key === 'Escape') setOpen(false);
    else return;
    event.preventDefault();
  };

  return (
    <div className="menu" ref={rootRef}>
      <button
        type="button"
        className="menu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-testid={testId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open && (
        <ul id={menuId} ref={listRef} role="menu" className="menu__list" onKeyDown={onKeyDown}>
          {entries.map((entry, index) =>
            entry === 'separator' ? (
              <li key={`separator-${index}`} role="separator" className="menu__separator" />
            ) : (
              <li key={entry.id} role="none">
                <button
                  type="button"
                  role={entry.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                  aria-checked={entry.checked}
                  disabled={entry.disabled}
                  className="menu__item"
                  data-testid={`menu-${entry.id}`}
                  onClick={() => {
                    setOpen(false);
                    entry.onSelect();
                  }}
                >
                  <span className="menu__check">
                    {entry.checked && <Check aria-hidden="true" size="1em" />}
                  </span>
                  <span>{entry.label}</span>
                  {entry.shortcut && <span className="menu__shortcut">{entry.shortcut}</span>}
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
