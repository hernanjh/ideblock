import type { PortInfo } from '@ideblock/shared';
import { describe, expect, it } from 'vitest';
import { JsonObjectStream } from '../src/main/toolchain/json-stream';
import { applyDiscoveryEvent, isUsbPort, toPortInfo } from '../src/main/toolchain/ports';

describe('JsonObjectStream', () => {
  it('splits pretty-printed objects that arrive in pieces', () => {
    const stream = new JsonObjectStream();
    expect(stream.push('{\n  "a": "x{y}",\n')).toEqual([]);
    expect(stream.push('  "b": {"c": 1}\n}\n{"d"')).toEqual([{ a: 'x{y}', b: { c: 1 } }]);
    expect(stream.push(': "\\"}"}')).toEqual([{ d: '"}' }]);
  });
});

describe('port discovery', () => {
  const uno = {
    eventType: 'add' as const,
    port: {
      address: 'COM3',
      label: 'COM3',
      protocol: 'serial',
      properties: { vid: '0x2341', pid: '0x0043' },
    },
    matching_boards: [{ name: 'Arduino Uno', fqbn: 'arduino:avr:uno' }],
  };

  it('maps discovery events to ports', () => {
    expect(toPortInfo(uno)).toEqual({
      address: 'COM3',
      label: 'COM3',
      vid: '2341',
      pid: '0043',
      boards: [{ name: 'Arduino Uno', fqbn: 'arduino:avr:uno' }],
    });
  });

  it('adds and removes ports', () => {
    const ports = new Map<string, PortInfo>();
    expect(applyDiscoveryEvent(ports, uno)).toBe(true);
    expect(ports.size).toBe(1);
    expect(applyDiscoveryEvent(ports, { ...uno, eventType: 'remove' })).toBe(true);
    expect(ports.size).toBe(0);
  });

  it('ignores network ports and recognizes built-in serial ports', () => {
    expect(
      toPortInfo({ eventType: 'add', port: { address: '192.168.0.2', protocol: 'network' } }),
    ).toBeNull();
    const builtIn = toPortInfo({
      eventType: 'add',
      port: { address: '/dev/ttyS0', protocol: 'serial' },
    });
    expect(builtIn && isUsbPort(builtIn)).toBe(false);
  });
});
