import { useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

const KEYBOARD_STEP = 0.02;

interface SplitterProps {
  /** "vertical" separates side-by-side panels; "horizontal" separates stacked ones. */
  orientation: 'vertical' | 'horizontal';
  containerRef: RefObject<HTMLElement | null>;
  /** Fraction of the container taken by the controlled panel. */
  value: number;
  min: number;
  max: number;
  /** True when the controlled panel sits after the splitter (right or bottom). */
  controlsTrailingPanel?: boolean;
  label: string;
  testId?: string;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number): number => Math.round(value * 1000) / 1000;

export function Splitter({
  orientation,
  containerRef,
  value,
  min,
  max,
  controlsTrailingPanel = false,
  label,
  testId,
  onChange,
  onCommit,
}: SplitterProps) {
  const dragValue = useRef(value);

  const fractionFromPointer = (event: PointerEvent<HTMLDivElement>): number | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const position =
      orientation === 'vertical'
        ? (event.clientX - rect.left) / rect.width
        : (event.clientY - rect.top) / rect.height;
    return round(clamp(controlsTrailingPanel ? 1 - position : position, min, max));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    dragValue.current = value;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const next = fractionFromPointer(event);
    if (next !== null && next !== dragValue.current) {
      dragValue.current = next;
      onChange(next);
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onCommit(dragValue.current);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const growKeys = orientation === 'vertical' ? ['ArrowRight'] : ['ArrowDown'];
    const shrinkKeys = orientation === 'vertical' ? ['ArrowLeft'] : ['ArrowUp'];
    let next: number | null = null;
    if (growKeys.includes(event.key)) {
      next = value + (controlsTrailingPanel ? -KEYBOARD_STEP : KEYBOARD_STEP);
    } else if (shrinkKeys.includes(event.key)) {
      next = value + (controlsTrailingPanel ? KEYBOARD_STEP : -KEYBOARD_STEP);
    } else if (event.key === 'Home') {
      next = min;
    } else if (event.key === 'End') {
      next = max;
    }
    if (next === null) return;
    event.preventDefault();
    const clamped = round(clamp(next, min, max));
    onChange(clamped);
    onCommit(clamped);
  };

  return (
    <div
      className={`splitter splitter--${orientation}`}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuemin={Math.round(min * 100)}
      aria-valuemax={Math.round(max * 100)}
      aria-valuenow={Math.round(value * 100)}
      data-testid={testId}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    />
  );
}
