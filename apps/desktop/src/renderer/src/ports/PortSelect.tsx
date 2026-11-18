import { BOARDS } from '@ideblock/boards';
import { Usb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { usePortsStore, visiblePorts } from '../state/ports';
import { useProjectStore } from '../state/project';

export function PortSelect() {
  const { t } = useTranslation();
  const ports = usePortsStore(useShallow(visiblePorts));
  const selected = usePortsStore((state) => state.selected);
  const select = usePortsStore((state) => state.select);
  const boardId = useProjectStore((state) => state.boardId);
  const setBoard = useProjectStore((state) => state.setBoard);

  const port = ports.find((item) => item.address === selected);
  const detected = port?.boards
    .map((board) => BOARDS.find((known) => known.fqbn === board.fqbn))
    .find(Boolean);
  // Clone boards often report no name, so only a confident match is suggested.
  const suggestBoard = detected && detected.id !== boardId && !boardId.startsWith(detected.id);

  return (
    <div className="field-inline">
      <label className="field-inline">
        <span className="field-inline__label">{t('ports.short')}</span>
        <Usb aria-hidden="true" size="1.2em" />
        <select
          data-testid="port-select"
          title={t('ports.label')}
          value={selected ?? ''}
          onChange={(event) => select(event.target.value || null)}
        >
          {ports.length === 0 && <option value="">{t('ports.none')}</option>}
          {ports.length > 0 && !selected && <option value="">{t('ports.choose')}</option>}
          {ports.map((item) => (
            <option key={item.address} value={item.address}>
              {item.boards[0] ? `${item.label} · ${item.boards[0].name}` : item.label}
            </option>
          ))}
        </select>
      </label>
      {suggestBoard && detected && (
        <button
          type="button"
          className="chip"
          data-testid="use-detected-board"
          onClick={() => setBoard(detected.id)}
        >
          {t('ports.useBoard', { board: detected.name })}
        </button>
      )}
    </div>
  );
}
