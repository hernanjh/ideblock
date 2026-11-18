import { create } from 'zustand';

export type MainView = 'program' | 'circuit';
export type AppDialog = 'settings' | 'about' | 'assembly' | null;

interface UiState {
  /** True while the simulator is shown in its own window. */
  simulatorDetached: boolean;
  view: MainView;
  /** Component selected in the circuit, shown in the properties panel. */
  selectedComponent: string | null;
  dialog: AppDialog;
  openDialog: (dialog: AppDialog) => void;
  setSimulatorDetached: (detached: boolean) => void;
  setView: (view: MainView) => void;
  selectComponent: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  simulatorDetached: false,
  view: 'program',
  selectedComponent: null,
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  setSimulatorDetached: (simulatorDetached) => set({ simulatorDetached }),
  setView: (view) => set({ view }),
  selectComponent: (selectedComponent) => set({ selectedComponent }),
}));
