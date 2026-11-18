import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import type {
  EventChannel,
  EventContract,
  InvokeArgs,
  InvokeChannel,
  InvokeResult,
} from '@ideblock/shared';

type Handler<C extends InvokeChannel> = (
  event: IpcMainInvokeEvent,
  ...args: InvokeArgs<C>
) => InvokeResult<C> | Promise<InvokeResult<C>>;

export type InvokeHandlers = { [C in InvokeChannel]: Handler<C> };

export function registerInvokeHandlers(handlers: InvokeHandlers): void {
  for (const channel of Object.keys(handlers) as InvokeChannel[]) {
    const handler = handlers[channel] as (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
    ipcMain.handle(channel, handler);
  }
}

export function broadcast<C extends EventChannel>(channel: C, payload: EventContract[C]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}
