import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { EVENT_CHANNELS, INVOKE_CHANNELS, type IdeBlockApi } from '@ideblock/shared/ipc';

const invokeChannels = new Set<string>(INVOKE_CHANNELS);
const eventChannels = new Set<string>(EVENT_CHANNELS);

// Only allow-listed channels cross the bridge, so a compromised renderer cannot
// reach arbitrary handlers in the main process.
const api: IdeBlockApi = {
  invoke: (channel, ...args) => {
    if (!invokeChannels.has(channel)) {
      return Promise.reject(new Error(`Unknown channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel, listener) => {
    if (!eventChannels.has(channel)) {
      throw new Error(`Unknown channel: ${channel}`);
    }
    const wrapped = (_event: IpcRendererEvent, payload: unknown): void => {
      listener(payload as Parameters<typeof listener>[0]);
    };
    ipcRenderer.on(channel, wrapped);
    return () => {
      ipcRenderer.removeListener(channel, wrapped);
    };
  },
};

contextBridge.exposeInMainWorld('ideblock', api);
