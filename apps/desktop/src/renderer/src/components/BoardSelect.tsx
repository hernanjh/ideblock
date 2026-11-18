import { BOARDS } from '@ideblock/boards';
import { CircuitBoard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../state/project';

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
        {BOARDS.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name}
          </option>
        ))}
      </select>
    </label>
  );
}
