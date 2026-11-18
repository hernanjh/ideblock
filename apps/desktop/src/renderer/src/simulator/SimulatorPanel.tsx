import { getBoard } from '@ideblock/boards';
import { COMPONENTS, findComponent, type ComponentInput } from '@ideblock/simulator';
import { Pause, Play, Plus, RotateCcw, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircuitScene } from '../circuit/CircuitScene';
import { ComponentIcon } from '../circuit/ComponentIcon';
import { BuzzerAudio } from './buzzer-audio';
import { VISUALS } from './catalog';
import { circuitComponents, newComponent, type CircuitItem } from './circuit';
import { useSimulatorModel } from './model';
import { componentNames } from './names';

const formatTime = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
};

export function SimulatorPanel() {
  const { t } = useTranslation();
  const { snapshot, dispatch } = useSimulatorModel();
  const {
    circuit,
    boardId,
    status,
    timeMs,
    speed,
    error,
    outdated,
    components: states,
    inputs,
  } = snapshot;
  const board = getBoard(boardId);
  const items = useMemo(() => circuitComponents(circuit), [circuit]);
  const names = useMemo(() => componentNames(items, t), [items, t]);
  const running = status === 'running' || status === 'paused';
  const sendInput = (id: string, input: ComponentInput): void =>
    dispatch({ type: 'input', id, input });

  return (
    <div className="simulator" data-testid="simulator">
      <CircuitScene
        board={board}
        items={items}
        states={states}
        inputs={inputs}
        running={running}
        fit
        names={names}
        onInput={sendInput}
        onSelect={(id) => id && dispatch({ type: 'openCircuit', componentId: id })}
      />

      <SimulationBar
        status={status}
        timeMs={timeMs}
        speed={speed}
        outdated={outdated}
        onStart={() => dispatch({ type: 'start' })}
        onStop={() => dispatch({ type: 'stop' })}
        onPause={() => dispatch({ type: status === 'paused' ? 'resume' : 'pause' })}
      />

      {status === 'unsupported' && (
        <p className="notice" role="status">
          {t('simulator.unsupported', { board: board.name })}
        </p>
      )}
      {error && (
        <p className="notice" role="alert">
          {t('simulator.crashed')}
        </p>
      )}

      <ComponentStrip
        items={items}
        names={names}
        states={states}
        inputs={inputs}
        onInput={sendInput}
        onOpen={(id) => dispatch({ type: 'openCircuit', componentId: id })}
        onAdd={(type) => {
          const component = newComponent(type, circuit, board);
          if (!component) return;
          dispatch({
            type: 'setCircuit',
            circuit: {
              ...circuit,
              components: [
                ...circuit.components,
                component as unknown as (typeof circuit.components)[number],
              ],
            },
          });
        }}
      />
      <BuzzerSound />
    </div>
  );
}

export interface SimulationBarProps {
  status: string;
  timeMs: number;
  speed: number;
  outdated: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
}

export function SimulationBar({
  status,
  timeMs,
  speed,
  outdated,
  onStart,
  onStop,
  onPause,
}: SimulationBarProps) {
  const { t } = useTranslation();
  const running = status === 'running' || status === 'paused';
  const statusText =
    status === 'compiling'
      ? t('simulator.preparing')
      : status === 'running'
        ? t('simulator.running')
        : status === 'paused'
          ? t('simulator.paused')
          : t('simulator.stopped');

  return (
    <div className="sim-bar" data-testid="simulator-status">
      {running ? (
        <button
          type="button"
          className="sim-bar__main sim-bar__main--stop"
          aria-label={t('simulator.stop')}
          title={t('simulator.stop')}
          data-testid="simulator-stop"
          onClick={onStop}
        >
          <Square aria-hidden="true" size="1.1em" />
        </button>
      ) : (
        <button
          type="button"
          className="sim-bar__main"
          aria-label={t('simulator.start')}
          title={t('simulator.start')}
          data-testid="simulator-start"
          disabled={status === 'compiling'}
          onClick={onStart}
        >
          <Play aria-hidden="true" size="1.1em" />
        </button>
      )}
      <button
        type="button"
        className="icon-button icon-button--framed"
        aria-label={status === 'paused' ? t('simulator.resume') : t('simulator.pause')}
        title={status === 'paused' ? t('simulator.resume') : t('simulator.pause')}
        aria-pressed={status === 'paused'}
        data-testid="simulator-pause"
        disabled={!running}
        onClick={onPause}
      >
        <Pause aria-hidden="true" size="1.1em" />
      </button>
      <button
        type="button"
        className="icon-button icon-button--framed"
        aria-label={t('simulator.restart')}
        title={t('simulator.restart')}
        data-testid="simulator-restart"
        disabled={!running}
        onClick={onStart}
      >
        <RotateCcw aria-hidden="true" size="1.1em" />
      </button>
      <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
      <strong>{statusText}</strong>
      {running && speed < 0.9 && <span className="chip">{t('simulator.slow')}</span>}
      {outdated && (
        <span className="chip" data-testid="simulator-outdated">
          {t('simulator.outdated')}
        </span>
      )}
      <span className="sim-bar__time mono">{formatTime(timeMs)}</span>
    </div>
  );
}

interface ComponentStripProps {
  items: CircuitItem[];
  names: Record<string, string>;
  states: Record<string, Record<string, number | boolean | string>>;
  inputs: Record<string, ComponentInput>;
  onInput: (id: string, input: ComponentInput) => void;
  onOpen: (id: string) => void;
  onAdd: (type: string) => void;
}

function ComponentStrip({
  items,
  names,
  states,
  inputs,
  onInput,
  onOpen,
  onAdd,
}: ComponentStripProps) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);

  return (
    <section className="components" aria-label={t('simulator.components')}>
      <h3 className="components__title">
        {t('simulator.components')}
        <span className="components__hint">{t('simulator.componentsHint')}</span>
      </h3>
      {items.length === 0 && <p className="console__empty">{t('simulator.empty')}</p>}
      <ul className="components__grid">
        {items.map((item) => (
          <li key={item.id}>
            <ComponentCard
              item={item}
              name={names[item.id] ?? item.type}
              state={states[item.id]}
              input={inputs[item.id]}
              onInput={onInput}
              onOpen={() => onOpen(item.id)}
            />
          </li>
        ))}
        <li>
          <button
            type="button"
            className="component-card component-card--add"
            aria-expanded={adding}
            data-testid="simulator-add"
            onClick={() => setAdding((value) => !value)}
          >
            <Plus aria-hidden="true" size="1.6em" />
            <span>{t('simulator.add')}</span>
          </button>
        </li>
      </ul>
      {adding && (
        <ul className="simulator__catalog" data-testid="simulator-catalog">
          {COMPONENTS.map((definition) => (
            <li key={definition.type}>
              <button
                type="button"
                data-testid={`add-${definition.type}`}
                onClick={() => {
                  setAdding(false);
                  onAdd(definition.type);
                }}
              >
                {t(`components.${definition.type}` as never)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface ComponentCardProps {
  item: CircuitItem;
  name: string;
  state: Record<string, number | boolean | string> | undefined;
  input: ComponentInput | undefined;
  onInput: (id: string, input: ComponentInput) => void;
  onOpen: () => void;
}

function ComponentCard({ item, name, state, input, onInput, onOpen }: ComponentCardProps) {
  const { t } = useTranslation();
  const visual = VISUALS[item.type];
  const definition = findComponent(item.type);
  const pins = Object.values(item.pins).join(', ');

  return (
    <div
      className="component-card"
      data-testid={`component-${item.id}`}
      data-state={state ? JSON.stringify(state) : undefined}
    >
      <button type="button" className="component-card__open" onClick={onOpen}>
        <ComponentIcon type={item.type} size={30} />
        <strong>{name}</strong>
        <span className="pin-chip">{t('simulator.pinList', { pins })}</span>
      </button>
      {visual?.control === 'press' && (
        <button
          type="button"
          className="press-button"
          aria-pressed={Boolean(state?.['pressed'])}
          data-testid={`press-${item.id}`}
          onPointerDown={() => onInput(item.id, { pressed: true })}
          onPointerUp={() => onInput(item.id, { pressed: false })}
          onPointerLeave={() => state?.['pressed'] && onInput(item.id, { pressed: false })}
          onKeyDown={(event) => {
            if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
              onInput(item.id, { pressed: true });
            }
          }}
          onKeyUp={() => onInput(item.id, { pressed: false })}
        >
          {t('simulator.press')}
        </button>
      )}
      {(visual?.control === 'slider' || visual?.control === 'distance') && (
        <Slider
          item={item}
          name={name}
          distance={visual.control === 'distance'}
          initial={Number(
            definition?.initialInput?.[visual.control === 'distance' ? 'distance' : 'value'] ?? 0,
          )}
          input={input}
          onInput={onInput}
        />
      )}
    </div>
  );
}

interface SliderProps {
  item: CircuitItem;
  name: string;
  distance: boolean;
  initial: number;
  input: ComponentInput | undefined;
  onInput: (id: string, input: ComponentInput) => void;
}

function Slider({ item, name, distance, initial, input, onInput }: SliderProps) {
  const { t } = useTranslation();
  const key = distance ? 'distance' : 'value';
  const value = Number(input?.[key] ?? initial);
  const [min, max] = distance ? [2, 400] : [0, 1023];
  return (
    <label className="component-card__slider">
      <span>
        {distance
          ? t('simulator.distance', { value })
          : t(`simulator.level.${item.type}` as never, { value })}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={name}
        data-testid={`slider-${item.id}`}
        onChange={(event) => onInput(item.id, { [key]: Number(event.target.value) })}
      />
    </label>
  );
}

function BuzzerSound() {
  const { snapshot } = useSimulatorModel();
  const frequency = Object.values(snapshot.components).reduce(
    (current, component) => current || Number(component['frequency'] ?? 0),
    0,
  );
  const audio = useRef<BuzzerAudio | null>(null);

  useEffect(() => {
    audio.current ??= new BuzzerAudio();
    audio.current.play(frequency);
  }, [frequency]);

  useEffect(() => () => audio.current?.dispose(), []);
  return null;
}
