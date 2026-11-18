float readTemperatureC(int pin) {
  // 10 kOhm NTC thermistor (beta 3950) in a divider with a 10 kOhm resistor.
  int reading = analogRead(pin);
  if (reading <= 0 || reading >= 1023) return -273.15;
  float kelvin = 1.0 / (log(1.0 / (1023.0 / reading - 1.0)) / 3950.0 + 1.0 / 298.15);
  return kelvin - 273.15;
}

void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
}

void loop() {
  Serial.println(readTemperatureC(A0));
  if (readTemperatureC(A0) > 30) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
  delay(500);
}
