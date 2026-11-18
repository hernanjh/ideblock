long brightness = 0;

void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  brightness = map(analogRead(A0), 0, 1023, 0, 100);
  analogWrite(9, map(constrain(brightness, 0, 100), 0, 100, 0, 255));
}
