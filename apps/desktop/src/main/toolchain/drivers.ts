import { execFile } from 'node:child_process';
import type { MissingDriver } from '@ideblock/shared';

const DRIVERS: { chip: MissingDriver['chip']; vid: string; url: string }[] = [
  { chip: 'CH340', vid: '1A86', url: 'https://www.wch-ic.com/downloads/CH341SER_EXE.html' },
  {
    chip: 'CP210x',
    vid: '10C4',
    url: 'https://www.silabs.com/developer-tools/usb-to-uart-bridge-vcp-drivers',
  },
  { chip: 'FTDI', vid: '0403', url: 'https://ftdichip.com/drivers/vcp-drivers/' },
];

/**
 * On Windows, clone boards often show up as USB devices with a driver error and
 * no COM port. Those devices are listed by vendor id so the user can be guided
 * to the right driver.
 */
export function findMissingDrivers(): Promise<MissingDriver[]> {
  if (process.platform !== 'win32') return Promise.resolve([]);
  const script =
    "Get-PnpDevice -PresentOnly | Where-Object { $_.Status -ne 'OK' } | " +
    'Select-Object -ExpandProperty InstanceId';
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: 10_000 },
      (error, stdout) => {
        if (error) return resolve([]);
        const ids = stdout.toUpperCase();
        resolve(
          DRIVERS.filter((driver) => ids.includes(`VID_${driver.vid}`)).map(({ chip, url }) => ({
            chip,
            url,
          })),
        );
      },
    );
  });
}
