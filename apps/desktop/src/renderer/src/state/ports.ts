import type { MissingDriver, PortInfo } from '@ideblock/shared';
import { create } from 'zustand';

interface PortsState {
  ports: PortInfo[];
  selected: string | null;
  /** Also list built-in serial ports without USB ids. */
  showAll: boolean;
  missingDrivers: MissingDriver[];
  setPorts: (ports: PortInfo[]) => void;
  select: (address: string | null) => void;
  setShowAll: (showAll: boolean) => void;
  checkDrivers: () => Promise<void>;
}

export const isUsb = (port: PortInfo): boolean => Boolean(port.vid);

export function visiblePorts(state: Pick<PortsState, 'ports' | 'showAll'>): PortInfo[] {
  return state.showAll ? state.ports : state.ports.filter(isUsb);
}

export const usePortsStore = create<PortsState>((set, get) => ({
  ports: [],
  selected: null,
  showAll: false,
  missingDrivers: [],
  setPorts: (ports) => {
    const { selected, showAll } = get();
    const visible = visiblePorts({ ports, showAll });
    const stillThere = visible.some((port) => port.address === selected);
    // A single board is picked automatically; with several, the user chooses.
    const next = stillThere ? selected : visible.length === 1 ? visible[0]!.address : null;
    set({ ports, selected: next });
  },
  select: (selected) => set({ selected }),
  setShowAll: (showAll) => set({ showAll }),
  checkDrivers: async () => {
    set({ missingDrivers: await window.ideblock.invoke('ports:missing-drivers') });
  },
}));
