import { create } from 'zustand';
import { parsePlotLine } from '../serial/plot-parser';

const MAX_LINES = 1000;
const MAX_POINTS = 300;

export const BAUD_RATES = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as const;

export type SerialSource = 'board' | 'simulator';

export interface PlotSeries {
  label: string;
  values: number[];
}

interface SerialState {
  source: SerialSource;
  open: boolean;
  port: string | null;
  error: string | null;
  baudRate: number;
  lines: string[];
  /** Text received after the last line break. */
  partial: string;
  plot: { x: number[]; series: PlotSeries[] };
  setSource: (source: SerialSource) => void;
  setStatus: (status: { open: boolean; port?: string | null; error?: string | null }) => void;
  setBaudRate: (baudRate: number) => void;
  receive: (text: string) => void;
  clear: () => void;
}

let sample = 0;

function addPoint(plot: SerialState['plot'], line: string): SerialState['plot'] {
  const values = parsePlotLine(line);
  if (!values) return plot;
  const series = [...plot.series];
  for (const { label, value } of values) {
    let entry = series.find((item) => item.label === label);
    if (!entry) {
      // Series that start late are padded so all of them share the x axis.
      entry = { label, values: plot.x.map(() => Number.NaN) };
      series.push(entry);
    }
    entry.values = [...entry.values, value].slice(-MAX_POINTS);
  }
  const x = [...plot.x, sample++].slice(-MAX_POINTS);
  for (const entry of series) {
    if (entry.values.length < x.length) {
      entry.values = [...entry.values, Number.NaN].slice(-MAX_POINTS);
    }
  }
  return { x, series };
}

export const useSerialStore = create<SerialState>((set, get) => ({
  source: 'board',
  open: false,
  port: null,
  error: null,
  baudRate: 9600,
  lines: [],
  partial: '',
  plot: { x: [], series: [] },
  setSource: (source) => set({ source }),
  setStatus: ({ open, port = get().port, error = null }) => set({ open, port, error }),
  setBaudRate: (baudRate) => set({ baudRate }),
  receive: (text) => {
    const state = get();
    const parts = (state.partial + text).split(/\r?\n/);
    const partial = parts.pop() ?? '';
    let plot = state.plot;
    for (const line of parts) plot = addPoint(plot, line);
    set({ lines: [...state.lines, ...parts].slice(-MAX_LINES), partial, plot });
  },
  clear: () => set({ lines: [], partial: '', plot: { x: [], series: [] } }),
}));
