/** Libraries installed automatically when a hand-written sketch includes their header. */
const LIBRARY_BY_HEADER: Record<string, string> = {
  'Servo.h': 'Servo',
  'ESP32Servo.h': 'ESP32Servo',
  'Adafruit_NeoPixel.h': 'Adafruit NeoPixel',
  'LiquidCrystal_I2C.h': 'LiquidCrystal I2C',
  'DHT.h': 'DHT sensor library',
};

export function librariesForCode(code: string): string[] {
  const libraries = new Set<string>();
  for (const match of code.matchAll(/^\s*#include\s*[<"]([^>"]+)[>"]/gm)) {
    const library = LIBRARY_BY_HEADER[match[1] ?? ''];
    if (library) libraries.add(library);
  }
  return [...libraries];
}
