import { ChartLine, Eraser, Plug, Send, Unplug, Text } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortsStore } from '../state/ports';
import { BAUD_RATES, useSerialStore } from '../state/serial';
import { useSimulationStore } from '../state/simulation';
import { SerialPlotter } from './SerialPlotter';

type View = 'text' | 'plot';

export function SerialMonitor() {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('text');
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
  const fromSimulator = source === 'simulator';

  useEffect(() => {
    const output = outputRef.current;
    if (output) output.scrollTop = output.scrollHeight;
  }, [lines, partial]);

  const connect = async (): Promise<void> => {
    if (!port) return;
    await window.ideblock.invoke('serial:open', { port, baudRate });
  };

  const send = (): void => {
    if (!message || (!open && !fromSimulator)) return;
    if (fromSimulator) useSimulationStore.getState().sendSerial(`${message}\n`);
    else void window.ideblock.invoke('serial:write', `${message}\n`);
    setMessage('');
  };

  return (
    <div className="serial">
      <div className="serial__toolbar">
        {!fromSimulator &&
          (open ? (
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
          ))}
        <label className="toolbar__field">
          <span>{t('serial.speed')}</span>
          <select
            value={baudRate}
            disabled={open || fromSimulator}
            data-testid="serial-baud"
            onChange={(event) => setBaudRate(Number(event.target.value))}
          >
            {BAUD_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}
              </option>
            ))}
          </select>
        </label>
        <div className="toolbar__group" role="group" aria-label={t('serial.view')}>
          <button
            type="button"
            className="toggle-button toggle-button--small"
            aria-pressed={view === 'text'}
            onClick={() => setView('text')}
          >
            <Text aria-hidden="true" size="1.1em" />
            {t('serial.text')}
          </button>
          <button
            type="button"
            className="toggle-button toggle-button--small"
            aria-pressed={view === 'plot'}
            data-testid="serial-plot-view"
            onClick={() => setView('plot')}
          >
            <ChartLine aria-hidden="true" size="1.1em" />
            {t('serial.plot')}
          </button>
        </div>
        <button type="button" className="toggle-button--small" onClick={clear}>
          <Eraser aria-hidden="true" size="1.1em" />
          {t('serial.clear')}
        </button>
        {fromSimulator && <span className="chip">{t('serial.fromSimulator')}</span>}
      </div>

      {error && (
        <p className="serial__error" role="alert">
          {t('serial.error')} <code>{error}</code>
        </p>
      )}

      {view === 'text' ? (
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
      ) : (
        <SerialPlotter />
      )}

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
        <button type="submit" disabled={!open && !fromSimulator}>
          <Send aria-hidden="true" size="1.1em" />
          {t('serial.send')}
        </button>
      </form>
    </div>
  );
}
