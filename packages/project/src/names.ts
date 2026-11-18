const MAX_SKETCH_NAME = 63;

/**
 * Sketch folders and their .ino file must share a name made of letters,
 * digits, "_", "-" and "." that starts with a letter or digit.
 */
export function toSketchName(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_.-]/g, '')
    .replace(/^[^A-Za-z0-9]+/, '')
    .slice(0, MAX_SKETCH_NAME);
  return ascii === '' ? 'sketch' : ascii;
}

export function isValidSketchName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_.-]{0,62}$/.test(name);
}
