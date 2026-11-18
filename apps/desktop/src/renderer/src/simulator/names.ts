import type { TFunction } from 'i18next';
import type { CircuitItem } from './circuit';

/** Display names: the name the user gave, or the component type numbered when repeated. */
export function componentNames(items: CircuitItem[], t: TFunction): Record<string, string> {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.type, (totals.get(item.type) ?? 0) + 1);
  const seen = new Map<string, number>();
  const names: Record<string, string> = {};
  for (const item of items) {
    const count = (seen.get(item.type) ?? 0) + 1;
    seen.set(item.type, count);
    const given = item.props?.['name'];
    const base = t(`components.${item.type}` as never);
    names[item.id] =
      typeof given === 'string' && given.trim() !== ''
        ? given
        : (totals.get(item.type) ?? 0) > 1
          ? `${base} ${count}`
          : base;
  }
  return names;
}
