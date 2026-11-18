#include <Wire.h>
#include <LiquidCrystal_PCF8574.h>

LiquidCrystal_PCF8574 lcd(0x27);

float readTemperatureC(int pin) {
  // 10 kOhm NTC thermistor (beta 3950) in a divider with a 10 kOhm resistor.
  int reading = analogRead(pin);
  if (reading <= 0 || reading >= 1023) return -273.15;
  float kelvin = 1.0 / (log(1.0 / (1023.0 / reading - 1.0)) / 3950.0 + 1.0 / 298.15);
  return kelvin - 273.15;
}

void setup() {
  lcd.begin(16, 2);
  lcd.setBacklight(255);
  lcd.setCursor(0, 0);
  lcd.print("Temperatura:");
}

void loop() {
  lcd.setCursor(0, 1);
  lcd.print(String(readTemperatureC(A0)) + String(" C   "));
  delay(1000);
}
