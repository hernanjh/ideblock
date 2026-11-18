import { BOARDS, type BoardFamily } from '@ideblock/boards';
import { CircuitBoard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../state/project';

const FAMILIES: BoardFamily[] = ['arduino', 'esp32', 'esp8266', 'raspberry-pi'];

export function BoardSelect() {
  const { t } = useTranslation();
  const boardId = useProjectStore((state) => state.boardId);
  const setBoard = useProjectStore((state) => state.setBoard);

  return (
    <label className="field-inline">
      <span className="field-inline__label">{t('toolbar.board')}</span>
      <CircuitBoard aria-hidden="true" size="1.2em" />
      <select
        data-testid="board-select"
        value={boardId}
        title={t('toolbar.board')}
        onChange={(event) => setBoard(event.target.value)}
      >
        {FAMILIES.map((family) => (
          <optgroup key={family} label={t(`boardFamily.${family}`)}>
            {BOARDS.filter((board) => board.family === family).map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
