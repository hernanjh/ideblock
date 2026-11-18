import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { SerialOpenRequest, SerialStatus } from '@ideblock/shared';
import type { ArduinoCli } from './arduino-cli';

const FLUSH_INTERVAL_MS = 50;

interface SerialListeners {
  onData: (text: string) => void;
  onStatus: (status: SerialStatus) => void;
}

/**
 * Serial monitor backed by `arduino-cli monitor`, which avoids shipping a
 * native serial module for every platform and Electron version.
 */
export class SerialMonitor {
  private child: ChildProcessWithoutNullStreams | null = null;
  private current: SerialOpenRequest | null = null;
  private pending = '';
  private flushTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly cli: ArduinoCli,
    private readonly listeners: SerialListeners,
  ) {}

  get session(): SerialOpenRequest | null {
    return this.current;
  }

  async open(request: SerialOpenRequest): Promise<SerialStatus> {
    this.close();
    const child = await this.cli.spawn([
      'monitor',
      '--port',
      request.port,
      '--config',
      `baudrate=${request.baudRate}`,
      '--quiet',
    ]);
    this.child = child;
    this.current = request;

    child.stdout.on('data', (chunk: Buffer) => this.queue(chunk.toString('utf8')));
    let errorOutput = '';
    child.stderr.on('data', (chunk: Buffer) => {
      errorOutput += chunk.toString('utf8');
    });
    child.on('close', () => {
      if (this.child !== child) return;
      this.flush();
      this.child = null;
      this.current = null;
      const message = errorOutput.trim();
      this.listeners.onStatus(
        message ? { state: 'error', port: request.port, message } : { state: 'closed' },
      );
    });

    const status: SerialStatus = { state: 'open', port: request.port };
    this.listeners.onStatus(status);
    return status;
  }

  write(text: string): void {
    this.child?.stdin.write(text);
  }

  close(): void {
    const child = this.child;
    if (!child) return;
    this.child = null;
    this.current = null;
    this.flush();
    child.kill();
    this.listeners.onStatus({ state: 'closed' });
  }

  private queue(text: string): void {
    this.pending += text;
    // Batching keeps fast senders from flooding the renderer with tiny messages.
    this.flushTimer ??= setTimeout(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  private flush(): void {
    clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    if (this.pending) {
      this.listeners.onData(this.pending);
      this.pending = '';
    }
  }
}
