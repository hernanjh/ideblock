export interface PlotValue {
  label: string;
  value: number;
}

const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

/**
 * Reads a line printed for plotting, in the formats used by common serial
 * plotters: "12 34", "12,34", "12\t34" or labelled "temp:21.5 hum:40".
 * Unlabelled values are named by position. Returns null for text lines.
 */
export function parsePlotLine(line: string): PlotValue[] | null {
  const parts = line
    .trim()
    .split(/[\s,;]+/)
    .filter((part) => part !== '');
  if (parts.length === 0) return null;

  const values: PlotValue[] = [];
  for (const [index, part] of parts.entries()) {
    const separator = part.lastIndexOf(':');
    const label = separator > 0 ? part.slice(0, separator) : String(index + 1);
    const raw = separator > 0 ? part.slice(separator + 1) : part;
    if (!NUMBER.test(raw)) return null;
    values.push({ label, value: Number(raw) });
  }
  return values;
}
