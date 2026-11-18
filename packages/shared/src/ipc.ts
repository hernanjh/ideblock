import type { Settings, SettingsPatch } from './settings';

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  systemLanguages: string[];
}

/**
 * Request/response channels handled by the main process. Adding a channel here
 * makes it type-checked end to end: main handler, preload bridge and renderer.
 */
export interface InvokeContract {
  'app:get-info': { args: []; result: AppInfo };
  'settings:get': { args: []; result: Settings };
  'settings:update': { args: [patch: SettingsPatch]; result: Settings };
}

/** Events pushed from the main process to the renderer. */
export interface EventContract {
  'settings:changed': Settings;
}

export type InvokeChannel = keyof InvokeContract;
export type InvokeArgs<C extends InvokeChannel> = InvokeContract[C]['args'];
export type InvokeResult<C extends InvokeChannel> = InvokeContract[C]['result'];
export type EventChannel = keyof EventContract;

// Record keys force these lists to stay exhaustive when the contracts change.
const invokeChannelSet: Record<InvokeChannel, true> = {
  'app:get-info': true,
  'settings:get': true,
  'settings:update': true,
};
const eventChannelSet: Record<EventChannel, true> = {
  'settings:changed': true,
};

export const INVOKE_CHANNELS = Object.keys(invokeChannelSet) as InvokeChannel[];
export const EVENT_CHANNELS = Object.keys(eventChannelSet) as EventChannel[];

export interface IdeBlockApi {
  invoke<C extends InvokeChannel>(channel: C, ...args: InvokeArgs<C>): Promise<InvokeResult<C>>;
  on<C extends EventChannel>(channel: C, listener: (payload: EventContract[C]) => void): () => void;
}
