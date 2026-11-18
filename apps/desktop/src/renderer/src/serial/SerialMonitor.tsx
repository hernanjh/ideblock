import { ChartLine, Eraser, Plug, Send, Unplug } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortsStore } from '../state/ports';
import { BAUD_RATES, useSerialStore } from '../state/serial';
import { useSettingsStore } from '../state/settings';
import { useSimulationStore } from '../state/simulation';
import { SerialPlotter } from './SerialPlotter';

export function SerialMonitor() {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const outputRef = useRef<HTMLPreElement>(null);

  const open = useSerialStore((state) => state.open);
  const source = useSerialStore((state) => state.source);
  const error = useSerialStore((state) => state.error);
  const baudRate = useSerialStore((state) => state.baudRate);
  const lines = useSerialStore((state) => state.lines);
  const partial = useSerialStore((state) => state.partial);
  const setBaudRate = useSerialStore((state) => state.setBaudRate);
  const clear = useSerialStore((state) => state.clear);
  const port = usePortsStore((state) => state.selected);
  const graphVisible = useSettingsStore((state) => state.settings.consoleGraphVisible);
  const update = useSettingsStore((state) => state.update);
  const fromSimulator = source === 'simulator';
  const canSend = open || fromSimulator;

  useEffect(() => {
    const output = outputRef.current;
    if (output) output.scrollTop = output.scrollHeight;
  }, [lines, partial]);

  const connect = async (): Promise<void> => {
    if (!port) return;
    await window.ideblock.invoke('serial:open', { port, baudRate });
  };

  const send = (): void => {
    if (!message || !canSend) return;
    if (fromSimulator) useSimulationStore.getState().sendSerial(`${message}\n`);
    else void window.ideblock.invoke('serial:write', `${message}\n`);
    setMessage('');
  };

  return (
    <div className="serial">
      <div className="serial__toolbar">
        {fromSimulator ? (
          <span className="chip" data-testid="serial-source">
            <span className="status-dot status-dot--running" aria-hidden="true" />
            {t('serial.fromSimulator')}
          </span>
        ) : open ? (
          <button
            type="button"
            data-testid="serial-disconnect"
            onClick={() => void window.ideblock.invoke('serial:close')}
          >
            <Unplug aria-hidden="true" size="1.1em" />
            {t('serial.disconnect')}
          </button>
        ) : (
          <button
            type="button"
            className="button--primary"
            data-testid="serial-connect"
            disabled={!port}
            title={port ? undefined : t('serial.noPort')}
            onClick={() => void connect()}
          >
            <Plug aria-hidden="true" size="1.1em" />
            {t('serial.connect')}
          </button>
        )}
        <label className="field-inline">
          <span className="visually-hidden">{t('serial.speed')}</span>
          <select
            value={baudRate}
            disabled={open || fromSimulator}
            data-testid="serial-baud"
            onChange={(event) => setBaudRate(Number(event.target.value))}
          >
            {BAUD_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {t('serial.baud', { rate })}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={clear} title={t('serial.clear')}>
          <Eraser aria-hidden="true" size="1.1em" />
          {t('serial.clear')}
        </button>
        <button
          type="button"
          className="toggle-button"
          aria-pressed={graphVisible}
          data-testid="serial-plot-view"
          onClick={() => void update({ consoleGraphVisible: !graphVisible })}
        >
          <ChartLine aria-hidden="true" size="1.1em" />
          {t('console.graph')}
        </button>
      </div>

      {error && (
        <p className="serial__error" role="alert">
          {t('serial.error')} <code>{error}</code>
        </p>
      )}

      <div className={graphVisible ? 'serial__views serial__views--split' : 'serial__views'}>
        <div className="serial__text">
          <pre
            ref={outputRef}
            className="serial__output"
            data-testid="serial-output"
            aria-live="polite"
          >
            {lines.join('\n')}
            {lines.length > 0 && partial ? '\n' : ''}
            {partial}
          </pre>
          <form
            className="serial__input"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <input
              value={message}
              aria-label={t('serial.message')}
              placeholder={t('serial.messagePlaceholder')}
              data-testid="serial-message"
              onChange={(event) => setMessage(event.target.value)}
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label={t('serial.send')}
              title={t('serial.send')}
            >
              <Send aria-hidden="true" size="1.1em" />
            </button>
          </form>
        </div>
        {graphVisible && <SerialPlotter />}
      </div>
    </div>
  );
}
