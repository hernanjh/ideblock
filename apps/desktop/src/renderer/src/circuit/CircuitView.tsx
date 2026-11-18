import { getBoard } from '@ideblock/boards';
import { pinsFor, type PinKind } from '@ideblock/blocks';
import { COMPONENTS, findComponent } from '@ideblock/simulator';
import {
  CircleCheck,
  Maximize,
  Search,
  Trash2,
  TriangleAlert,
  Waypoints,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { simulate } from '../build/actions';
import {
  circuitComponents,
  newComponent,
  sharedPins,
  updateComponent,
  withComponents,
  wiringMode,
  type CircuitItem,
  type WiringMode,
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
import { supplyPin } from './layout';
import {
  WIRE_COLOURS,
  circuitAnalysis,
  circuitWires,
  nextWireId,
  removePart,
  toAutoWiring,
  toManualWiring,
  withWires,
} from './model';
import type { CircuitAnalysis, CircuitIssue } from './netlist';

const ZOOM_STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2];
const LED_COLOURS = ['red', 'green', 'yellow', 'blue', 'white'] as const;
const WIRE_COLOUR_NAMES = ['blue', 'green', 'orange', 'red', 'black', 'purple'] as const;
const ASSEMBLY_PARTS = ['breadboard', 'resistor'];
const WIRING_MODES: readonly WiringMode[] = ['auto', 'manual'];

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
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [wireColour, setWireColour] = useState(WIRE_COLOURS[0]!);

  const board = getBoard(boardId);
  const items = useMemo(() => circuitComponents(circuit), [circuit]);
  const names = useMemo(() => componentNames(items, t), [items, t]);
  const selectedItem = items.find((item) => item.id === selected) ?? null;
  const running = simulation.status === 'running' || simulation.status === 'paused';
  const mode = wiringMode(circuit);
  const wires = useMemo(() => circuitWires(circuit), [circuit]);
  const analysis = useMemo(() => circuitAnalysis(circuit, board), [circuit, board]);

  const add = (type: string): void => {
    const component = newComponent(type, circuit, board);
    if (!component) return;
    setCircuit(withComponents(circuit, [...items, component]));
    select(component.id);
  };

  const remove = (id: string): void => {
    setCircuit(removePart(circuit, id));
    select(null);
  };

  const removeWire = (id: string): void => {
    setCircuit(
      withWires(
        circuit,
        wires.filter((wire) => wire.id !== id),
      ),
    );
    setSelectedWire(null);
  };

  const setMode = (next: WiringMode): void => {
    if (next === mode) return;
    setSelectedWire(null);
    setCircuit(next === 'manual' ? toManualWiring(circuit, board) : toAutoWiring(circuit, board));
  };

  useEffect(() => {
    if (!selectedWire) return;
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Delete' || event.key === 'Backspace') removeWire(selectedWire);
      if (event.key === 'Escape') setSelectedWire(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const stepZoom = (direction: 1 | -1): void => {
    const current = zoom === 'fit' ? 1 : zoom;
    const index = ZOOM_STEPS.findIndex((step) => step >= current);
    const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + direction))];
    if (next) setZoom(next);
  };

  return (
    <div className="circuit-view" data-testid="circuit-view">
      <Palette onAdd={add} mode={mode} />

      <section className="card circuit-canvas" aria-label={t('rail.circuit')}>
        <div className="card__header">
          <h2 className="card__title">
            <Waypoints aria-hidden="true" size="1.1em" />
            {t('circuit.title', { board: board.name })}
          </h2>
          <div className="card__end">
            <span className="wiring-label">{t('circuit.wiring')}</span>
            <div className="segmented" role="group" aria-label={t('circuit.wiring')}>
              {WIRING_MODES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  title={t(
                    option === 'auto' ? 'circuit.wiringAutoHint' : 'circuit.wiringManualHint',
                  )}
                  data-testid={`wiring-${option}`}
                  disabled={running}
                  onClick={() => setMode(option)}
                >
                  {t(option === 'auto' ? 'circuit.wiringAuto' : 'circuit.wiringManual')}
                </button>
              ))}
            </div>
            {mode === 'manual' && (
              <div className="swatches" role="radiogroup" aria-label={t('circuit.wireColor')}>
                {WIRE_COLOURS.map((colour, index) => (
                  <button
                    key={colour}
                    type="button"
                    role="radio"
                    className="swatch"
                    style={{ background: colour }}
                    aria-checked={wireColour === colour}
                    aria-label={t(`colors.${WIRE_COLOUR_NAMES[index]!}`)}
                    title={t(`colors.${WIRE_COLOUR_NAMES[index]!}`)}
                    onClick={() => {
                      setWireColour(colour);
                      if (selectedWire) {
                        setCircuit(
                          withWires(
                            circuit,
                            wires.map((wire) =>
                              wire.id === selectedWire ? { ...wire, color: colour } : wire,
                            ),
                          ),
                        );
                      }
                    }}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              className="icon-button icon-button--framed"
              aria-label={selectedWire ? t('circuit.deleteWire') : t('circuit.delete')}
              title={selectedWire ? t('circuit.deleteWire') : t('circuit.delete')}
              disabled={!selectedItem && !selectedWire}
              data-testid="circuit-delete"
              onClick={() =>
                selectedWire ? removeWire(selectedWire) : selectedItem && remove(selectedItem.id)
              }
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
            mode={mode}
            wires={wires}
            selectedWireId={selectedWire}
            wireColour={wireColour}
            onSelectWire={setSelectedWire}
            onAddWire={(from, to) =>
              setCircuit(
                withWires(circuit, [
                  ...wires,
                  { id: nextWireId(wires), from, to, color: wireColour },
                ]),
              )
            }
            onInput={(id, input) => simulation.input(id, input)}
            onMove={(moves) =>
              setCircuit(
                withComponents(
                  circuit,
                  items.map((item) => (moves[item.id] ? { ...item, ...moves[item.id] } : item)),
                ),
              )
            }
          />
          {mode === 'manual' && <p className="circuit-hint">{t('circuit.wireHint')}</p>}
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
        analysis={analysis}
        names={names}
        supply={supplyPin(board)}
      />

      {consoleVisible && <div className="circuit-view__console">{console}</div>}
    </div>
  );
}

function Palette({ onAdd, mode }: { onAdd: (type: string) => void; mode: WiringMode }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const matching = (type: string): boolean =>
    String(t(`components.${type}` as never))
      .toLowerCase()
      .includes(normalized);
  const groups = [
    ...(mode === 'manual'
      ? [{ heading: t('circuit.assembly'), types: ASSEMBLY_PARTS.filter(matching) }]
      : []),
    {
      heading: t('circuit.basic'),
      types: COMPONENTS.map((definition) => definition.type).filter(matching),
    },
  ];

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
      {groups
        .filter((group) => group.types.length > 0)
        .map((group) => (
          <div key={group.heading}>
            <h3 className="palette__heading">{group.heading}</h3>
            <ul className="palette__grid">
              {group.types.map((type) => (
                <li key={type}>
                  <button
                    type="button"
                    className="palette__item"
                    title={t('circuit.addHint')}
                    data-testid={`add-${type}`}
                    onClick={() => onAdd(type)}
                  >
                    <ComponentIcon type={type} />
                    <span>{t(`components.${type}` as never)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
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
  /** Wiring analysis with hand wiring, null with automatic wiring. */
  analysis: CircuitAnalysis | null;
  names: Record<string, string>;
  supply: string;
}

function issueText(
  issue: CircuitIssue,
  items: CircuitItem[],
  names: Record<string, string>,
  supply: string,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  switch (issue.kind) {
    case 'short':
      return t('circuit.issue.short', { pins: issue.pins.join(' + ') });
    case 'unconnected': {
      const type = items.find((item) => item.id === issue.id)?.type ?? '';
      const leg = SHAPES[type]?.signals[issue.signal] ?? issue.signal;
      return t('circuit.issue.unconnected', {
        name: names[issue.id] ?? issue.id,
        // Leg names such as "1.l" contain the key separator.
        pin: t(`legs.${leg.replace('.', '_')}` as never, { defaultValue: leg }),
      });
    }
    case 'noSupply':
      return t('circuit.issue.noSupply', { name: names[issue.id] ?? issue.id, supply });
    default:
      return t(`circuit.issue.${issue.kind}`, { name: names[issue.id] ?? issue.id });
  }
}

/** With hand wiring and nothing selected: what is wrong with the circuit, if anything. */
function CircuitCheck({
  analysis,
  items,
  names,
  supply,
}: {
  analysis: CircuitAnalysis;
  items: CircuitItem[];
  names: Record<string, string>;
  supply: string;
}) {
  const { t } = useTranslation();
  return (
    <aside className="card properties" aria-label={t('circuit.check')} data-testid="circuit-check">
      <div className="card__header">
        <h2 className="card__title">{t('circuit.check')}</h2>
      </div>
      <div className="properties__body">
        {items.length === 0 ? (
          <p className="properties__info">{t('circuit.emptyCircuit')}</p>
        ) : analysis.issues.length === 0 ? (
          <p className="property-ok" data-testid="circuit-ok">
            <CircleCheck aria-hidden="true" size="1em" />
            {t('circuit.allGood')}
          </p>
        ) : (
          <ul className="issues">
            {analysis.issues.map((issue, index) => (
              <li key={index} className="property-warning" data-testid={`issue-${issue.kind}`}>
                <TriangleAlert aria-hidden="true" size="1em" />
                {issueText(issue, items, names, supply, t)}
              </li>
            ))}
          </ul>
        )}
        <p className="palette__hint">{t('circuit.selectHint')}</p>
      </div>
    </aside>
  );
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
  analysis,
  names,
  supply,
}: PropertiesProps) {
  const { t } = useTranslation();
  if (!item && analysis) {
    return <CircuitCheck analysis={analysis} items={items} names={names} supply={supply} />;
  }
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

        {item.type === 'resistor' && (
          <p className="property property--fixed">
            <span>{t('circuit.resistorValue')}</span>
            <span>{t('circuit.ohms', { value: 220 })}</span>
          </p>
        )}

        {definition && <h3 className="properties__section">{t('circuit.connections')}</h3>}
        {analysis &&
          definition?.pins.map((spec) => {
            const pin = analysis.reached[item.id]?.[spec.name] ?? null;
            return (
              <p
                key={spec.name}
                className="property property--fixed"
                data-testid={`reached-${item.id}-${spec.name}`}
              >
                <span>{t(`componentPins.${spec.name}` as never)}</span>
                <span className={pin ? 'reached' : 'reached reached--missing'}>
                  {pin ? t('circuit.connectedTo', { pin }) : t('circuit.notConnected')}
                </span>
              </p>
            );
          })}
        {analysis && definition && (
          <p className="palette__hint">{t('circuit.manualConnectionsHint')}</p>
        )}
        {analysis &&
          analysis.issues
            .filter((issue) => 'id' in issue && issue.id === item.id)
            .map((issue, index) => (
              <p key={index} className="property-warning" role="alert">
                <TriangleAlert aria-hidden="true" size="1em" />
                {issueText(issue, items, names, supply, t)}
              </p>
            ))}
        {!analysis &&
          definition?.pins.map((spec) => {
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
        {!analysis && shape && shape.ground.length > 0 && (
          <p className="property property--fixed">
            <span>{t('circuit.ground')}</span>
            <span>GND</span>
          </p>
        )}
        {!analysis && shape && shape.supply.length > 0 && (
          <p className="property property--fixed">
            <span>{t('circuit.supply')}</span>
            <span>{supplyLabel}</span>
          </p>
        )}
        {!analysis && Object.values(item.pins).some((pin) => conflicts.has(pin)) && (
          <p className="property-warning" role="alert" data-testid="pin-conflict">
            <TriangleAlert aria-hidden="true" size="1em" />
            {t('circuit.sharedPin')}
          </p>
        )}
        {!analysis && item.type === 'led' && (
          <p className="property-ok">{t('circuit.ledResistor')}</p>
        )}

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
