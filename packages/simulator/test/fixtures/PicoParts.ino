// Servo, tone and NeoPixel on the Raspberry Pi Pico, which arduino-pico
// drives through PIO state machines.
#include <Servo.h>
#include <Adafruit_NeoPixel.h>

Servo arm;
Adafruit_NeoPixel ring(4, 6, NEO_GRB + NEO_KHZ800);

void setup() {
  arm.attach(9, 544, 2400);
  ring.begin();
  arm.write(0);
  ring.setPixelColor(0, ring.Color(255, 0, 0));
  ring.setPixelColor(3, ring.Color(0, 0, 200));
  ring.show();
  tone(8, 440);
}

void loop() {
  delay(500);
  arm.write(180);
  noTone(8);
  ring.setPixelColor(1, ring.Color(0, 255, 0));
  ring.show();
  tone(8, 1000, 200);
  delay(1000000);
}
