/** Loads an Intel HEX file into a byte array, as produced by avr-gcc. */
export function loadHex(source: string, target: Uint8Array): void {
  let base = 0;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith(':')) continue;
    const bytes =
      line
        .slice(1)
        .match(/../g)
        ?.map((pair) => parseInt(pair, 16)) ?? [];
    const [count = 0, high = 0, low = 0, type = 0] = bytes;
    const data = bytes.slice(4, 4 + count);
    if (type === 0x00) {
      target.set(data, base + ((high << 8) | low));
    } else if (type === 0x02) {
      base = (((data[0] ?? 0) << 8) | (data[1] ?? 0)) << 4;
    } else if (type === 0x04) {
      base = (((data[0] ?? 0) << 8) | (data[1] ?? 0)) << 16;
    } else if (type === 0x01) {
      break;
    }
  }
}
