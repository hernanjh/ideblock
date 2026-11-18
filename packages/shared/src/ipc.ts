import type { CompilerDiagnostic } from '@ideblock/compiler';
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

export interface CompileRequest {
  code: string;
  boardId: string;
  /** Used as sketch folder and file name. */
  sketchName: string;
  libraries: string[];
}

export type CompileFailure = 'tool-missing' | 'core-install' | 'library-install' | 'compile';

export interface MemoryUsage {
  used: number;
  max: number;
}

export interface CompileResult {
  ok: boolean;
  failure?: CompileFailure;
  diagnostics: CompilerDiagnostic[];
  /** Raw compiler output, shown to users who want the details. */
  output: string;
  program?: MemoryUsage;
  data?: MemoryUsage;
  /** Build folder holding the firmware, used for upload and simulation. */
  buildPath?: string;
  /** Intel HEX firmware for AVR boards, read by the simulator. */
  hex?: string;
}

export type ToolchainStage = 'index' | 'core' | 'library' | 'compile' | 'upload';

export interface ToolchainProgress {
  stage: ToolchainStage;
  /** Name of the core or library being installed. */
  subject?: string;
  /** Latest line printed by the tool. */
  detail: string;
}

export interface PortInfo {
  address: string;
  label: string;
  /** USB ids in lower-case hex, when the port belongs to a USB device. */
  vid?: string;
  pid?: string;
  /** Boards that identified themselves on this port. */
  boards: { name: string; fqbn: string }[];
}

export interface MissingDriver {
  chip: 'CH340' | 'CP210x' | 'FTDI';
  /** Vendor page where the driver can be downloaded. */
  url: string;
}

export interface UploadRequest {
  compile: CompileRequest;
  port: string;
}

export type UploadFailure = 'compile' | 'upload' | CompileFailure;

export interface UploadResult {
  ok: boolean;
  failure?: UploadFailure;
  compile: CompileResult;
  /** Upload tool output, explained with the "uploadHelp" translations. */
  output: string;
}

export interface SerialOpenRequest {
  port: string;
  baudRate: number;
}

export interface SerialStatus {
  state: 'open' | 'closed' | 'error';
  port?: string;
  message?: string;
}

/**
 * Simulator state mirrored to the detached simulator window. Typed loosely here
 * because the renderer owns the exact shape.
 */
export type SimulatorSnapshot = Record<string, unknown>;
export type SimulatorAction = { type: string } & Record<string, unknown>;

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
  'toolchain:compile': { args: [request: CompileRequest]; result: CompileResult };
  'toolchain:upload': { args: [request: UploadRequest]; result: UploadResult };
  'ports:list': { args: []; result: PortInfo[] };
  'ports:missing-drivers': { args: []; result: MissingDriver[] };
  'serial:open': { args: [request: SerialOpenRequest]; result: SerialStatus };
  'serial:close': { args: []; result: void };
  'serial:write': { args: [text: string]; result: void };
  'app:open-external': { args: [url: string]; result: void };
  'app:focus-main': { args: []; result: void };
  'simulator:detach': { args: []; result: void };
  'simulator:attach': { args: []; result: void };
  'simulator:sync': { args: [snapshot: SimulatorSnapshot]; result: void };
  'simulator:action': { args: [action: SimulatorAction]; result: void };
}

/** Events pushed from the main process to the renderer. */
export interface EventContract {
  'settings:changed': Settings;
  'toolchain:progress': ToolchainProgress;
  'ports:changed': PortInfo[];
  'serial:data': string;
  'serial:status': SerialStatus;
  'simulator:detached': boolean;
  'simulator:snapshot': SimulatorSnapshot;
  'simulator:action': SimulatorAction;
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
  'toolchain:compile': true,
  'toolchain:upload': true,
  'ports:list': true,
  'ports:missing-drivers': true,
  'serial:open': true,
  'serial:close': true,
  'serial:write': true,
  'app:open-external': true,
  'app:focus-main': true,
  'simulator:detach': true,
  'simulator:attach': true,
  'simulator:sync': true,
  'simulator:action': true,
};
const eventChannelSet: Record<EventChannel, true> = {
  'settings:changed': true,
  'toolchain:progress': true,
  'ports:changed': true,
  'serial:data': true,
  'serial:status': true,
  'simulator:detached': true,
  'simulator:snapshot': true,
  'simulator:action': true,
};

export const INVOKE_CHANNELS = Object.keys(invokeChannelSet) as InvokeChannel[];
export const EVENT_CHANNELS = Object.keys(eventChannelSet) as EventChannel[];

export interface IdeBlockApi {
  invoke<C extends InvokeChannel>(channel: C, ...args: InvokeArgs<C>): Promise<InvokeResult<C>>;
  on<C extends EventChannel>(channel: C, listener: (payload: EventContract[C]) => void): () => void;
}
