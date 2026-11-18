#include <Wire.h>
#include <LiquidCrystal_PCF8574.h>

LiquidCrystal_PCF8574 lcd(0x27);
int seconds = 0;

void setup() {
  lcd.begin(16, 2);
  lcd.setBacklight(255);
  lcd.setCursor(0, 0);
  lcd.print("Hello!");
}

void loop() {
  lcd.setCursor(0, 1);
  lcd.print(seconds);
  seconds++;
  delay(1000);
}
