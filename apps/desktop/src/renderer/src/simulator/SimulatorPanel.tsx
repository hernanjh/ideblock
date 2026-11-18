import { getBoard } from '@ideblock/boards';
import { pinsFor } from '@ideblock/blocks';
import { COMPONENTS, findComponent, type ComponentInstance } from '@ideblock/simulator';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentCode, useProjectStore } from '../state/project';
import { useSimulationStore } from '../state/simulation';
import { BuzzerAudio } from './buzzer-audio';
import { VISUALS } from './catalog';
import { circuitComponents, newComponent } from './circuit';
import { WokwiElement } from './WokwiElement';

export function SimulatorPanel() {
  const { t } = useTranslation();
  const circuit = useProjectStore((state) => state.circuit);
  const boardId = useProjectStore((state) => state.boardId);
  const setCircuit = useProjectStore((state) => state.setCircuit);
  const code = useProjectStore(currentCode);
  const status = useSimulationStore((state) => state.status);
  const runningCode = useSimulationStore((state) => state.runningCode);
  const timeMs = useSimulationStore((state) => state.timeMs);
  const speed = useSimulationStore((state) => state.speed);
  const error = useSimulationStore((state) => state.error);
  const restart = useSimulationStore((state) => state.restart);
  const [adding, setAdding] = useState(false);

  const board = getBoard(boardId);
  const components = useMemo(() => circuitComponents(circuit), [circuit]);
  const firstRender = useRef(true);

  useEffect(() => {
    // Rewiring takes effect at once by restarting the running firmware.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    restart();
  }, [components, restart]);

  const update = (next: ComponentInstance[]): void =>
    // Component instances are plain JSON objects, which is what circuit.json stores.
    setCircuit({ ...circuit, components: next as unknown as typeof circuit.components });

  const add = (type: string): void => {
    const component = newComponent(type, circuit, board);
    setAdding(false);
    if (component) update([...components, component]);
  };

  return (
    <div className="simulator" data-testid="simulator">
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
      {status === 'running' && (
        <div className="simulator__status" data-testid="simulator-status">
          <span>{t('simulator.time', { seconds: (timeMs / 1000).toFixed(1) })}</span>
          {speed < 0.9 && <span className="chip">{t('simulator.slow')}</span>}
          {runningCode !== null && runningCode !== code && (
            <span className="chip" data-testid="simulator-outdated">
              {t('simulator.outdated')}
            </span>
          )}
        </div>
      )}

      {components.length === 0 && <p className="console__empty">{t('simulator.empty')}</p>}

      <ul className="simulator__components">
        {components.map((component) => (
          <ComponentCard
            key={component.id}
            component={component}
            boardId={boardId}
            onChange={(changed) =>
              update(components.map((item) => (item.id === changed.id ? changed : item)))
            }
            onRemove={() => update(components.filter((item) => item.id !== component.id))}
          />
        ))}
      </ul>

      <div className="simulator__add">
        <button
          type="button"
          aria-expanded={adding}
          data-testid="simulator-add"
          onClick={() => setAdding((value) => !value)}
        >
          <Plus aria-hidden="true" size="1.1em" />
          {t('simulator.add')}
        </button>
        {adding && (
          <ul className="simulator__catalog" data-testid="simulator-catalog">
            {COMPONENTS.map((definition) => (
              <li key={definition.type}>
                <button
                  type="button"
                  data-testid={`add-${definition.type}`}
                  onClick={() => add(definition.type)}
                >
                  {t(`components.${definition.type}` as never)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BuzzerSound />
    </div>
  );
}

interface ComponentCardProps {
  component: ComponentInstance;
  boardId: string;
  onChange: (component: ComponentInstance) => void;
  onRemove: () => void;
}

function ComponentCard({ component, boardId, onChange, onRemove }: ComponentCardProps) {
  const { t } = useTranslation();
  const definition = findComponent(component.type);
  const visual = VISUALS[component.type];
  const state = useSimulationStore((store) => store.components[component.id]);
  const input = useSimulationStore((store) => store.inputs[component.id]);
  const sendInput = useSimulationStore((store) => store.input);
  const name = t(`components.${component.type}` as never);

  const events = useMemo(
    () =>
      visual?.control === 'press'
        ? {
            'button-press': () => sendInput(component.id, { pressed: true }),
            'button-release': () => sendInput(component.id, { pressed: false }),
          }
        : visual?.control === 'slider' && component.type === 'potentiometer'
          ? {
              input: (event: Event) =>
                sendInput(component.id, { value: Number((event as CustomEvent).detail) }),
            }
          : undefined,
    [visual?.control, component.id, component.type, sendInput],
  );

  if (!definition || !visual) return null;
  const board = getBoard(boardId);

  return (
    <li
      className="component-card"
      data-testid={`component-${component.id}`}
      data-state={state ? JSON.stringify(state) : undefined}
    >
      <div className="component-card__header">
        <strong>{name}</strong>
        <button
          type="button"
          className="icon-button"
          aria-label={t('simulator.remove', { name })}
          title={t('simulator.remove', { name })}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" size="1em" />
        </button>
      </div>
      <WokwiElement
        tag={visual.tag}
        label={name}
        properties={visual.properties(state, input, component.props)}
        {...(events ? { events } : {})}
      />
      {definition.pins.map((spec) => {
        const options = [...pinsFor(board, spec.kind)];
        const value = component.pins[spec.name] ?? '';
        if (value && !options.includes(value)) options.push(value);
        return (
          <label key={spec.name} className="component-card__pin">
            <span>{t(`componentPins.${spec.name}` as never)}</span>
            <select
              value={value}
              data-testid={`pin-${component.id}-${spec.name}`}
              onChange={(event) =>
                onChange({
                  ...component,
                  pins: { ...component.pins, [spec.name]: event.target.value },
                })
              }
            >
              {options.map((pin) => (
                <option key={pin} value={pin}>
                  {pin}
                </option>
              ))}
            </select>
          </label>
        );
      })}
      <Control component={component} name={name} />
    </li>
  );
}

function Control({ component, name }: { component: ComponentInstance; name: string }) {
  const { t } = useTranslation();
  const visual = VISUALS[component.type];
  const definition = findComponent(component.type);
  const state = useSimulationStore((store) => store.components[component.id]);
  const input = useSimulationStore((store) => store.inputs[component.id]);
  const sendInput = useSimulationStore((store) => store.input);

  if (visual?.control === 'press') {
    const pressed = Boolean(state?.['pressed']);
    return (
      <button
        type="button"
        className="press-button"
        aria-pressed={pressed}
        data-testid={`press-${component.id}`}
        onPointerDown={() => sendInput(component.id, { pressed: true })}
        onPointerUp={() => sendInput(component.id, { pressed: false })}
        onPointerLeave={() => pressed && sendInput(component.id, { pressed: false })}
        onKeyDown={(event) => {
          if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
            sendInput(component.id, { pressed: true });
          }
        }}
        onKeyUp={() => sendInput(component.id, { pressed: false })}
      >
        {t('simulator.press')}
      </button>
    );
  }

  if (visual?.control === 'slider' || visual?.control === 'distance') {
    const key = visual.control === 'distance' ? 'distance' : 'value';
    const initial = Number(definition?.initialInput?.[key] ?? 0);
    const value = Number(input?.[key] ?? initial);
    const [min, max] = visual.control === 'distance' ? [2, 400] : [0, 1023];
    return (
      <label className="component-card__slider">
        <span>
          {visual.control === 'distance'
            ? t('simulator.distance', { value })
            : t(`simulator.level.${component.type}` as never, { value })}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label={name}
          data-testid={`slider-${component.id}`}
          onChange={(event) => sendInput(component.id, { [key]: Number(event.target.value) })}
        />
      </label>
    );
  }
  return null;
}

function BuzzerSound() {
  const frequency = useSimulationStore((state) =>
    Object.values(state.components).reduce(
      (current, component) => current || Number(component['frequency'] ?? 0),
      0,
    ),
  );
  const audio = useRef<BuzzerAudio | null>(null);

  useEffect(() => {
    audio.current ??= new BuzzerAudio();
    audio.current.play(frequency);
  }, [frequency]);

  useEffect(() => () => audio.current?.dispose(), []);
  return null;
}
