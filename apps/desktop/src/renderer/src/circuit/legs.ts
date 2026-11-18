/** Translation function shape this helper needs; any i18next `t` fits it. */
type Translate = (key: string[], options: { defaultValue: string }) => string;

/**
 * Name of a part's leg for the interface. A name for the part's type wins over
 * the shared one, since "A" is the long leg of an LED but a segment of a display.
 * Leg names such as "1.l" contain the key separator, so dots become underscores.
 */
export function legName(t: unknown, type: string, leg: string): string {
  const key = leg.replace('.', '_');
  return (t as Translate)([`legs.${type}.${key}`, `legs.${key}`], { defaultValue: leg });
}
