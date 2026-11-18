import type { IdeBlockApi } from '@ideblock/shared/ipc';

declare global {
  interface Window {
    readonly ideblock: IdeBlockApi;
  }
}

export {};
