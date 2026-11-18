import type { ProjectDocument } from '@ideblock/project';
import type { Settings, SettingsPatch } from './settings';

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  systemLanguages: string[];
}

export interface OpenedProject {
  project: ProjectDocument;
  /** Project folder, or null for projects that were never saved. */
  path: string | null;
}

export interface ExampleSummary {
  id: string;
  title: { en?: string | undefined; es?: string | undefined };
  description: { en?: string | undefined; es?: string | undefined };
  level: number;
  order: number;
}

export interface RecentProject {
  path: string;
  name: string;
}

/** Texts for native dialogs, translated by the renderer. */
export interface DialogTexts {
  title: string;
  filterName: string;
}

export type ProjectErrorReason =
  | 'unsupported-version'
  | 'invalid-manifest'
  | 'invalid-file'
  | 'missing-sketch'
  | 'not-found'
  | 'write-failed';

export type ProjectResult<T> = { ok: true; value: T } | { ok: false; reason: ProjectErrorReason };

/**
 * Request/response channels handled by the main process. Adding a channel here
 * makes it type-checked end to end: main handler, preload bridge and renderer.
 */
export interface InvokeContract {
  'app:get-info': { args: []; result: AppInfo };
  'settings:get': { args: []; result: Settings };
  'settings:update': { args: [patch: SettingsPatch]; result: Settings };
  'project:open': { args: [texts: DialogTexts]; result: ProjectResult<OpenedProject> | null };
  'project:open-path': { args: [path: string]; result: ProjectResult<OpenedProject> };
  'project:save': { args: [project: ProjectDocument, path: string]; result: ProjectResult<string> };
  'project:save-as': {
    args: [project: ProjectDocument, texts: DialogTexts];
    result: ProjectResult<string> | null;
  };
  'project:export-sketch': {
    args: [code: string, name: string, texts: DialogTexts];
    result: ProjectResult<string> | null;
  };
  'project:examples': { args: []; result: ExampleSummary[] };
  'project:load-example': { args: [id: string]; result: ProjectResult<ProjectDocument> };
  'project:recent': { args: []; result: RecentProject[] };
  'session:load': { args: []; result: OpenedProject | null };
  'session:save': { args: [session: OpenedProject]; result: void };
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
  'project:open': true,
  'project:open-path': true,
  'project:save': true,
  'project:save-as': true,
  'project:export-sketch': true,
  'project:examples': true,
  'project:load-example': true,
  'project:recent': true,
  'session:load': true,
  'session:save': true,
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
