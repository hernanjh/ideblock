import { describe, expect, it } from 'vitest';
import { explainUploadError } from '../src';

describe('explainUploadError', () => {
  it.each([
    ['avrdude: ser_open(): can\'t open device "\\\\.\\COM3": Access is denied.', 'portBusy'],
    [
      'avrdude: ser_open(): can\'t open device "/dev/ttyUSB0": Permission denied',
      'linuxPermission',
    ],
    [
      'avrdude: ser_open(): can\'t open device "COM7": The system cannot find the file specified.',
      'portMissing',
    ],
    ['avrdude: stk500_recv(): programmer is not responding', 'notInSync'],
    ['avrdude: stk500_getsync() attempt 10 of 10: not in sync: resp=0x00', 'notInSync'],
    [
      'A fatal error occurred: Failed to connect to ESP32: Wrong boot mode detected (0x13)!',
      'espBootMode',
    ],
  ])('explains %s', (output, key) => {
    expect(explainUploadError(output)).toBe(key);
  });

  it('returns null for unknown failures', () => {
    expect(explainUploadError('something else')).toBeNull();
  });
});
