#include <Adafruit_NeoPixel.h>

Adafruit_NeoPixel pixels_6(8, 6, NEO_GRB + NEO_KHZ800);
int led = 0;

void setup() {
  pixels_6.begin();
}

void loop() {
  for (led = 1; led <= 8; led++) {
    pixels_6.clear();
    pixels_6.show();
    pixels_6.setPixelColor(led - 1, pixels_6.Color(255, 0, 0));
    pixels_6.show();
    delay(150);
  }
}
