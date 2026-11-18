import type { SimulatorAction, SimulatorSnapshot } from '@ideblock/shared';
import type { BrowserWindow } from 'electron';
import { createAppWindow } from './window';

/**
 * Manages the optional separate simulator window. The simulation keeps running
 * in the main window; this window shows it and sends user input back, with
 * the main process relaying messages between the two.
 */
export class SimulatorWindow {
  private window: BrowserWindow | null = null;

  constructor(
    private readonly mainWindow: () => BrowserWindow | null,
    private readonly isDev: boolean,
  ) {}

  open(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return;
    }
    const window = createAppWindow(this.isDev, {
      view: 'simulator',
      width: 720,
      height: 640,
      minWidth: 360,
      minHeight: 360,
    });
    this.window = window;
    window.on('closed', () => {
      this.window = null;
      this.mainWindow()?.webContents.send('simulator:detached', false);
    });
    this.mainWindow()?.webContents.send('simulator:detached', true);
  }

  close(): void {
    this.window?.close();
  }

  sync(snapshot: SimulatorSnapshot): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('simulator:snapshot', snapshot);
    }
  }

  forward(action: SimulatorAction): void {
    this.mainWindow()?.webContents.send('simulator:action', action);
  }
}
