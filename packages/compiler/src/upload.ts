/**
 * Plain-language causes for upload failures, as translation keys under
 * "uploadHelp". Upload tools word their errors very differently, so the
 * patterns cover avrdude, esptool and the operating systems' port errors.
 */
const UPLOAD_RULES: { key: string; pattern: RegExp }[] = [
  {
    key: 'linuxPermission',
    pattern: /Permission denied.*\/dev\/tty|\/dev\/tty\S*: Permission denied/i,
  },
  {
    key: 'portBusy',
    pattern: /(Access is denied|Resource busy|port is busy|Permission denied|Acceso denegado)/i,
  },
  {
    key: 'portMissing',
    pattern:
      /(No such file or directory|cannot find the file|could not open port|can't open device|port not found|no such port)/i,
  },
  {
    key: 'espBootMode',
    pattern: /(Failed to connect to ESP32|Wrong boot mode|Timed out waiting for packet header)/i,
  },
  {
    key: 'notInSync',
    pattern: /(not in sync|stk500.*(recv|getsync)|programmer is not responding)/i,
  },
];

export function explainUploadError(output: string): string | null {
  return UPLOAD_RULES.find((rule) => rule.pattern.test(output))?.key ?? null;
}

export const UPLOAD_HELP_KEYS: readonly string[] = UPLOAD_RULES.map((rule) => rule.key);
