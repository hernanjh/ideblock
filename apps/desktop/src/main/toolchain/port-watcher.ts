import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { PortInfo } from '@ideblock/shared';
import type { ArduinoCli } from './arduino-cli';
import { JsonObjectStream } from './json-stream';
import { applyDiscoveryEvent, type DiscoveryEvent } from './ports';

const RESTART_DELAY_MS = 3000;

/** Keeps the list of serial ports up to date while boards are plugged in and out. */
export class PortWatcher {
  private readonly ports = new Map<string, PortInfo>();
  private child: ChildProcessWithoutNullStreams | null = null;
  private stopped = false;
  private restartTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly cli: ArduinoCli,
    private readonly onChange: (ports: PortInfo[]) => void,
  ) {}

  list(): PortInfo[] {
    return [...this.ports.values()].sort((a, b) => a.address.localeCompare(b.address));
  }

  async start(): Promise<void> {
    this.stopped = false;
    try {
      const child = await this.cli.spawn(['board', 'list', '--watch', '--json']);
      this.child = child;
      const stream = new JsonObjectStream();
      child.stdout.on('data', (chunk: Buffer) => {
        let changed = false;
        for (const event of stream.push(chunk.toString('utf8'))) {
          changed = applyDiscoveryEvent(this.ports, event as DiscoveryEvent) || changed;
        }
        if (changed) this.onChange(this.list());
      });
      child.on('error', () => this.scheduleRestart());
      child.on('close', () => this.scheduleRestart());
    } catch {
      this.scheduleRestart();
    }
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.restartTimer);
    this.child?.kill();
    this.child = null;
  }

  private scheduleRestart(): void {
    this.child = null;
    if (this.stopped) return;
    clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => void this.start(), RESTART_DELAY_MS);
  }
}
