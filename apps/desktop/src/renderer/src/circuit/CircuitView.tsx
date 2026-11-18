import { getBoard } from '@ideblock/boards';
import { pinsFor, type PinKind } from '@ideblock/blocks';
import { COMPONENTS, findComponent } from '@ideblock/simulator';
import {
  Maximize,
  Search,
  Trash2,
  TriangleAlert,
  Waypoints,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { simulate } from '../build/actions';
import {
  circuitComponents,
  newComponent,
  sharedPins,
  updateComponent,
  withComponents,
  type CircuitItem,
} from '../simulator/circuit';
import { componentNames } from '../simulator/names';
import { SimulationBar } from '../simulator/SimulatorPanel';
import { useProjectStore } from '../state/project';
import { useSettingsStore } from '../state/settings';
import { useSimulationStore } from '../state/simulation';
import { useUiStore } from '../state/ui';
import { boardLayout } from './boards';
import { CircuitScene } from './CircuitScene';
import { ComponentIcon } from './ComponentIcon';
import { SHAPES } from './geometry';

const ZOOM_STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2];
const LED_COLOURS = ['red', 'green', 'yellow', 'blue', 'white'] as const;

/** Circuit screen: component palette, a large drawing and the selected component's properties. */
export function CircuitView({ console }: { console: ReactNode }) {
  const { t } = useTranslation();
  const circuit = useProjectStore((state) => state.circuit);
  const boardId = useProjectStore((state) => state.boardId);
  const setCircuit = useProjectStore((state) => state.setCircuit);
  const selected = useUiStore((state) => state.selectedComponent);
  const select = useUiStore((state) => state.selectComponent);
  const consoleVisible = useSettingsStore((state) => state.settings.consoleVisible);
  const simulation = useSimulationStore();
  const [zoom, setZoom] = useState<number | 'fit'>('fit');

  const board = getBoard(boardId);
  const items = useMemo(() => circuitComponents(circuit), [circuit]);
  const names = useMemo(() => componentNames(items, t), [items, t]);
  const selectedItem = items.find((item) => item.id === selected) ?? null;
  const running = simulation.status === 'running' || simulation.status === 'paused';

  const add = (type: string): void => {
    const component = newComponent(type, circuit, board);
    if (!component) return;
    setCircuit(withComponents(circuit, [...items, component]));
    select(component.id);
  };

  const remove = (id: string): void => {
    setCircuit(
      withComponents(
        circuit,
        items.filter((item) => item.id !== id),
      ),
    );
    select(null);
  };

  const stepZoom = (direction: 1 | -1): void => {
    const current = zoom === 'fit' ? 1 : zoom;
    const index = ZOOM_STEPS.findIndex((step) => step >= current);
    const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + direction))];
    if (next) setZoom(next);
  };

  return (
    <div className="circuit-view" data-testid="circuit-view">
      <Palette onAdd={add} />

      <section className="card circuit-canvas" aria-label={t('rail.circuit')}>
        <div className="card__header">
          <h2 className="card__title">
            <Waypoints aria-hidden="true" size="1.1em" />
            {t('circuit.title', { board: board.name })}
          </h2>
          <div className="card__end">
            <button
              type="button"
              className="icon-button icon-button--framed"
              aria-label={t('circuit.delete')}
              title={t('circuit.delete')}
              disabled={!selectedItem}
              data-testid="circuit-delete"
              onClick={() => selectedItem && remove(selectedItem.id)}
            >
              <Trash2 aria-hidden="true" size="1.1em" />
            </button>
            <button
              type="button"
              className="icon-button icon-button--framed"
              aria-label={t('circuit.zoomOut')}
              title={t('circuit.zoomOut')}
              onClick={() => stepZoom(-1)}
            >
              <ZoomOut aria-hidden="true" size="1.1em" />
            </button>
            <span className="zoom-label mono">
              {zoom === 'fit' ? t('circuit.fit') : `${Math.round(zoom * 100)}%`}
            </span>
            <button
              type="button"
              className="icon-button icon-button--framed"
              aria-label={t('circuit.zoomIn')}
              title={t('circuit.zoomIn')}
              data-testid="circuit-zoom-in"
              onClick={() => stepZoom(1)}
            >
              <ZoomIn aria-hidden="true" size="1.1em" />
            </button>
            <button
              type="button"
              className="icon-button icon-button--framed"
              aria-label={t('circuit.fitAll')}
              title={t('circuit.fitAll')}
              aria-pressed={zoom === 'fit'}
              onClick={() => setZoom('fit')}
            >
              <Maximize aria-hidden="true" size="1.1em" />
            </button>
          </div>
        </div>
        <div className="card__body circuit-canvas__body">
          <CircuitScene
            board={board}
            items={items}
            states={simulation.components}
            inputs={simulation.inputs}
            running={running}
            fit={zoom === 'fit'}
            zoom={zoom === 'fit' ? 1 : zoom}
            selectedId={selected}
            editable
            names={names}
            onSelect={select}
            onInput={(id, input) => simulation.input(id, input)}
            onMove={(id, position) =>
              setCircuit(updateComponent(circuit, id, (item) => ({ ...item, ...position })))
            }
          />
          <SimulationBar
            status={simulation.status}
            timeMs={simulation.timeMs}
            speed={simulation.speed}
            outdated={false}
            onStart={() => void simulate()}
            onStop={simulation.stop}
            onPause={simulation.status === 'paused' ? simulation.resume : simulation.pause}
          />
        </div>
      </section>

      <Properties
        item={selectedItem}
        items={items}
        name={selectedItem ? (names[selectedItem.id] ?? '') : ''}
        onClose={() => select(null)}
        onRemove={remove}
        onChange={(change) =>
          selectedItem && setCircuit(updateComponent(circuit, selectedItem.id, change))
        }
        boardName={board.name}
        pinOptions={(kind) => [...pinsFor(board, kind)]}
        supplyLabel={boardLayout(board).supplyLabel}
      />

      {consoleVisible && <div className="circuit-view__console">{console}</div>}
    </div>
  );
}

function Palette({ onAdd }: { onAdd: (type: string) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const matches = COMPONENTS.filter((definition) =>
    String(t(`components.${definition.type}` as never))
      .toLowerCase()
      .includes(normalized),
  );

  return (
    <section className="card palette" aria-label={t('circuit.palette')}>
      <label className="search-field">
        <Search aria-hidden="true" size="1em" />
        <input
          value={query}
          placeholder={t('circuit.search')}
          aria-label={t('circuit.search')}
          data-testid="palette-search"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <h3 className="palette__heading">{t('circuit.basic')}</h3>
      <ul className="palette__grid">
        {matches.map((definition) => (
          <li key={definition.type}>
            <button
              type="button"
              className="palette__item"
              title={t('circuit.addHint')}
              data-testid={`add-${definition.type}`}
              onClick={() => onAdd(definition.type)}
            >
              <ComponentIcon type={definition.type} />
              <span>{t(`components.${definition.type}` as never)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="palette__hint">{t('circuit.paletteHint')}</p>
    </section>
  );
}

interface PropertiesProps {
  item: CircuitItem | null;
  items: CircuitItem[];
  name: string;
  boardName: string;
  supplyLabel: string;
  pinOptions: (kind: PinKind) => string[];
  onChange: (change: (item: CircuitItem) => CircuitItem) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

function Properties({
  item,
  items,
  name,
  boardName,
  supplyLabel,
  pinOptions,
  onChange,
  onRemove,
  onClose,
}: PropertiesProps) {
  const { t } = useTranslation();
  if (!item) {
    return (
      <aside className="card properties" aria-label={t('circuit.properties')}>
        <p className="console__empty properties__empty">{t('circuit.selectHint')}</p>
      </aside>
    );
  }

  const definition = findComponent(item.type);
  const shape = SHAPES[item.type];
  const conflicts = sharedPins(items);
  const color = typeof item.props?.['color'] === 'string' ? item.props['color'] : 'red';

  return (
    <aside
      className="card properties"
      aria-label={t('circuit.properties')}
      data-testid="properties"
    >
      <div className="card__header">
        <ComponentIcon type={item.type} size={26} />
        <h2 className="card__title">{name}</h2>
        <button
          type="button"
          className="icon-button card__end"
          aria-label={t('common.close')}
          title={t('common.close')}
          onClick={onClose}
        >
          <X aria-hidden="true" size="1.1em" />
        </button>
      </div>
      <div className="properties__body">
        <h3 className="properties__section">{t('circuit.propertiesTitle')}</h3>
        <label className="property">
          <span>{t('circuit.name')}</span>
          <input
            value={typeof item.props?.['name'] === 'string' ? item.props['name'] : ''}
            placeholder={name}
            data-testid="property-name"
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                props: { ...current.props, name: event.target.value },
              }))
            }
          />
        </label>
        {item.type === 'led' && (
          <label className="property">
            <span>{t('circuit.color')}</span>
            <select
              value={color}
              data-testid="property-color"
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  props: { ...current.props, color: event.target.value },
                }))
              }
            >
              {LED_COLOURS.map((option) => (
                <option key={option} value={option}>
                  {t(`colors.${option}`)}
                </option>
              ))}
            </select>
          </label>
        )}

        <h3 className="properties__section">{t('circuit.connections')}</h3>
        {definition?.pins.map((spec) => {
          const value = item.pins[spec.name] ?? '';
          const options = pinOptions(spec.kind);
          if (value && !options.includes(value)) options.push(value);
          return (
            <label key={spec.name} className="property">
              <span>{t(`componentPins.${spec.name}` as never)}</span>
              <select
                value={value}
                data-testid={`pin-${item.id}-${spec.name}`}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    pins: { ...current.pins, [spec.name]: event.target.value },
                  }))
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
        {shape && shape.ground.length > 0 && (
          <p className="property property--fixed">
            <span>{t('circuit.ground')}</span>
            <span>GND</span>
          </p>
        )}
        {shape && shape.supply.length > 0 && (
          <p className="property property--fixed">
            <span>{t('circuit.supply')}</span>
            <span>{supplyLabel}</span>
          </p>
        )}
        {Object.values(item.pins).some((pin) => conflicts.has(pin)) && (
          <p className="property-warning" role="alert" data-testid="pin-conflict">
            <TriangleAlert aria-hidden="true" size="1em" />
            {t('circuit.sharedPin')}
          </p>
        )}
        {item.type === 'led' && <p className="property-ok">{t('circuit.ledResistor')}</p>}

        <h3 className="properties__section">{t('circuit.about')}</h3>
        <p className="properties__info">
          {t(`componentInfo.${item.type}` as never, { board: boardName })}
        </p>

        <button
          type="button"
          className="button--danger"
          data-testid="property-remove"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 aria-hidden="true" size="1em" />
          {t('circuit.remove', { name })}
        </button>
      </div>
    </aside>
  );
}
