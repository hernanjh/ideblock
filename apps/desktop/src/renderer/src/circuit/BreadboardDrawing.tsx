import {
  BREADBOARD_COLUMNS,
  BREADBOARD_HOLES,
  BREADBOARD_SIZE,
  MAIN_ROWS,
  PITCH,
  RAILS,
  columnX,
} from './breadboard';

const LABELLED_COLUMNS = [1, 5, 10, 15, 20, 25, 30];

/** A half-size breadboard. Highlighted holes show what a hovered hole is joined to. */
export function BreadboardDrawing({ highlight }: { highlight: ReadonlySet<string> }) {
  const { width, height } = BREADBOARD_SIZE;
  const firstRow = BREADBOARD_HOLES.find((hole) => hole.name === 'a1')!;
  const lastRow = BREADBOARD_HOLES.find((hole) => hole.name === 'j1')!;
  const gapTop = BREADBOARD_HOLES.find((hole) => hole.name === 'e1')!.y + PITCH / 2;
  const gapBottom = BREADBOARD_HOLES.find((hole) => hole.name === 'f1')!.y - PITCH / 2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <rect width={width} height={height} rx="6" fill="#f4f1ea" stroke="#d8d1c2" />
      <rect
        x="6"
        y={gapTop + 2}
        width={width - 12}
        height={gapBottom - gapTop - 4}
        fill="#e7e1d4"
      />
      {Object.values(RAILS).map(({ y, positive }) => {
        const lineY = positive ? y - PITCH * 0.7 : y + PITCH * 0.7;
        return (
          <g key={y}>
            <line
              x1="14"
              x2={width - 14}
              y1={lineY}
              y2={lineY}
              stroke={positive ? '#e53935' : '#1e88e5'}
              strokeWidth="1.4"
            />
            <text
              x="7"
              y={y + 3.5}
              fontSize="10"
              fontWeight="700"
              fill={positive ? '#e53935' : '#1e88e5'}
            >
              {positive ? '+' : '−'}
            </text>
          </g>
        );
      })}
      {MAIN_ROWS.map((row) => {
        const hole = BREADBOARD_HOLES.find((candidate) => candidate.name === `${row}1`)!;
        return (
          <text key={row} x="8" y={hole.y + 3} fontSize="8" fill="#8a8170">
            {row}
          </text>
        );
      })}
      {LABELLED_COLUMNS.filter((column) => column <= BREADBOARD_COLUMNS).map((column) => (
        <g key={column} fontSize="7.5" fill="#8a8170" textAnchor="middle">
          <text x={columnX(column)} y={firstRow.y - 7}>
            {column}
          </text>
          <text x={columnX(column)} y={lastRow.y + 12}>
            {column}
          </text>
        </g>
      ))}
      {BREADBOARD_HOLES.map((hole) => {
        const lit = highlight.has(hole.name);
        return (
          <rect
            key={hole.name}
            x={hole.x - (lit ? 3.4 : 2.6)}
            y={hole.y - (lit ? 3.4 : 2.6)}
            width={lit ? 6.8 : 5.2}
            height={lit ? 6.8 : 5.2}
            rx="1"
            fill={lit ? '#2fa84f' : '#3a3a3a'}
          />
        );
      })}
    </svg>
  );
}
