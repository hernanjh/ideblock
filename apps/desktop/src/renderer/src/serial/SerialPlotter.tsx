import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useSerialStore } from '../state/serial';

// Distinguishable on light and dark backgrounds, and for common colour blindness.
const SERIES_COLOURS = ['#0072b2', '#d55e00', '#009e73', '#cc79a7', '#e69f00', '#56b4e9'];

export function SerialPlotter() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const plot = useSerialStore((state) => state.plot);
  const labels = plot.series.map((series) => series.label).join('|');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const { plot: current } = useSerialStore.getState();
    const chart = new uPlot(
      {
        width: container.clientWidth,
        height: Math.max(120, container.clientHeight - 8),
        legend: { show: true },
        cursor: { drag: { x: false, y: false } },
        scales: { x: { time: false } },
        axes: [{ show: false }, { stroke: 'currentColor', grid: { stroke: '#8884' } }],
        series: [
          {},
          ...current.series.map((series, index) => ({
            label: series.label,
            stroke: SERIES_COLOURS[index % SERIES_COLOURS.length]!,
            width: 2,
            spanGaps: true,
          })),
        ],
      },
      [current.x, ...current.series.map((series) => series.values)],
      container,
    );
    chartRef.current = chart;
    const observer = new ResizeObserver(() =>
      chart.setSize({
        width: container.clientWidth,
        height: Math.max(120, container.clientHeight - 8),
      }),
    );
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.destroy();
      chartRef.current = null;
    };
    // The chart is rebuilt only when the set of series changes.
  }, [labels]);

  useEffect(() => {
    chartRef.current?.setData([plot.x, ...plot.series.map((series) => series.values)]);
  }, [plot]);

  return (
    <div className="plotter" data-testid="serial-plotter">
      {plot.series.length === 0 && <p className="console__empty">{t('serial.plotHint')}</p>}
      <div ref={containerRef} className="plotter__chart" />
    </div>
  );
}
