import { getBoard, pinLabel } from '@ideblock/boards';
import { Printer, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../components/Modal';
import { circuitComponents, wiringMode } from '../simulator/circuit';
import { componentNames } from '../simulator/names';
import { useProjectStore } from '../state/project';
import { assemblyPlan, type AssemblyStep } from './assembly';
import { CircuitScene } from './CircuitScene';
import { legName } from './legs';
import { WIRE_COLOURS, WIRE_COLOUR_NAMES, circuitWires } from './model';
import { describeTerminal } from './terminals';

/** What to gather and what to connect where, to build the circuit with real parts. */
export function AssemblyGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const circuit = useProjectStore((state) => state.circuit);
  const boardId = useProjectStore((state) => state.boardId);
  const board = getBoard(boardId);
  const items = useMemo(() => circuitComponents(circuit), [circuit]);
  const names = useMemo(() => componentNames(items, t), [items, t]);
  const plan = useMemo(() => assemblyPlan(circuit, board), [circuit, board]);
  const typeOf = (id: string): string => items.find((item) => item.id === id)?.type ?? '';
  const terminal = (id: string): string => describeTerminal(t, board, items, names, id);

  const leg = (part: string, name: string): string => {
    const text = legName(t, typeOf(part), name);
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const colourName = (hex: string | undefined): string => {
    const index = WIRE_COLOURS.indexOf(hex ?? '');
    return index >= 0 ? t(`colors.${WIRE_COLOUR_NAMES[index]!}`).toLowerCase() : '';
  };

  const sentence = (step: AssemblyStep): string => {
    switch (step.kind) {
      case 'pin': {
        const text = t('assembly.toPin', { pin: pinLabel(board, step.pin) });
        return `${leg(step.part, step.leg)} → ${text}${step.resistor ? t('assembly.throughResistor') : ''}.`;
      }
      case 'ground':
        return `${leg(step.part, step.leg)} → ${t('assembly.toGround')}.`;
      case 'supply':
        return `${leg(step.part, step.leg)} → ${t('assembly.toSupply', { supply: step.supply })}.`;
      case 'plug':
        return t('assembly.plug', {
          holes: step.holes
            .map(({ leg, hole }) => `${legName(t, typeOf(step.part), leg)} → ${terminal(hole)}`)
            .join('; '),
        });
      case 'wire':
        return t('assembly.wire', {
          colour: colourName(step.color),
          from: terminal(step.from),
          to: terminal(step.to),
        });
    }
  };

  // Automatic wiring lists the connections part by part; hand wiring lists what
  // goes into the breadboard, then every wire.
  const groups =
    wiringMode(circuit) === 'manual'
      ? [
          { title: t('assembly.plugTitle'), steps: plan.steps.filter((s) => s.kind === 'plug') },
          { title: t('assembly.wiresTitle'), steps: plan.steps.filter((s) => s.kind === 'wire') },
        ].filter((group) => group.steps.length > 0)
      : items
          .map((item) => ({
            title: names[item.id] ?? item.type,
            steps: plan.steps.filter((step) => 'part' in step && step.part === item.id),
          }))
          .filter((group) => group.steps.length > 0);

  return (
    <Modal
      open={open}
      wide
      title={t('assembly.title')}
      onClose={onClose}
      testId="assembly-guide"
      footer={
        <button type="button" className="button--primary" onClick={() => window.print()}>
          <Printer aria-hidden="true" size="1em" />
          {t('assembly.print')}
        </button>
      }
    >
      <div className="assembly">
        <h2 className="assembly__print-title">{t('assembly.title')}</h2>
        <p>{t('assembly.intro', { board: board.name })}</p>
        <div className="assembly__picture">
          <CircuitScene
            board={board}
            items={items}
            running={false}
            fit
            mode={wiringMode(circuit)}
            wires={circuitWires(circuit)}
            names={names}
          />
        </div>

        {plan.issues.length > 0 && (
          <p className="property-warning" role="alert">
            <TriangleAlert aria-hidden="true" size="1em" />
            {t('assembly.fixFirst')}
          </p>
        )}

        <h3>{t('assembly.partsTitle')}</h3>
        <ul className="assembly__parts" data-testid="assembly-parts">
          <li>{t('assembly.board', { board: board.name })}</li>
          {plan.parts.map(({ type, count }) => (
            <li key={type}>
              {t('assembly.part', { count, name: t(`components.${type}` as never) })}
            </li>
          ))}
          {plan.extraResistors > 0 && (
            <li>{t('assembly.resistors', { count: plan.extraResistors })}</li>
          )}
          {plan.wires > 0 && <li>{t('assembly.wires', { count: plan.wires })}</li>}
        </ul>

        <h3>{t('assembly.stepsTitle')}</h3>
        <p className="assembly__tip">{t('assembly.unplug')}</p>
        {groups.length === 0 ? (
          <p>{t('assembly.empty')}</p>
        ) : (
          groups.map((group) => (
            <section key={group.title} className="assembly__group">
              <h4>{group.title}</h4>
              <ol data-testid="assembly-steps">
                {group.steps.map((step, index) => (
                  <li key={index}>{sentence(step)}</li>
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </Modal>
  );
}
