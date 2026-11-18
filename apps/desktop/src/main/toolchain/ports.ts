import type { PortInfo } from '@ideblock/shared';

export interface DiscoveryPort {
  address: string;
  label?: string;
  protocol?: string;
  properties?: Record<string, string | undefined>;
}

export interface DiscoveryEvent {
  eventType?: 'add' | 'remove' | 'error' | 'quit';
  port?: DiscoveryPort;
  matching_boards?: { name: string; fqbn: string }[];
}

export function toPortInfo(event: DiscoveryEvent): PortInfo | null {
  const port = event.port;
  if (!port || port.protocol !== 'serial') return null;
  const vid = port.properties?.['vid']?.replace(/^0x/i, '').toLowerCase();
  const pid = port.properties?.['pid']?.replace(/^0x/i, '').toLowerCase();
  return {
    address: port.address,
    label: port.label ?? port.address,
    ...(vid ? { vid } : {}),
    ...(pid ? { pid } : {}),
    boards: event.matching_boards ?? [],
  };
}

/**
 * Ports without USB ids are built-in serial ports (COM1, /dev/ttyS0) that
 * never have a board attached, so they only appear when asked for.
 */
export function isUsbPort(port: PortInfo): boolean {
  return Boolean(port.vid);
}

/** Applies add/remove events to the current port list. */
export function applyDiscoveryEvent(ports: Map<string, PortInfo>, event: DiscoveryEvent): boolean {
  const info = toPortInfo(event);
  if (!info) return false;
  if (event.eventType === 'add') {
    ports.set(info.address, info);
    return true;
  }
  if (event.eventType === 'remove') {
    return ports.delete(info.address);
  }
  return false;
}
