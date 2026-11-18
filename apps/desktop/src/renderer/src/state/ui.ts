import { create } from 'zustand';

interface UiState {
  /** True while the simulator is shown in its own window. */
  simulatorDetached: boolean;
  setSimulatorDetached: (detached: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  simulatorDetached: false,
  setSimulatorDetached: (simulatorDetached) => set({ simulatorDetached }),
}));
