void setup() {
  pinMode(4, INPUT);
  pinMode(7, INPUT);
  pinMode(13, OUTPUT);
}

void loop() {
  if (digitalRead(4) == HIGH && digitalRead(7) == HIGH) {
    digitalWrite(13, HIGH);
    tone(8, 880, 200);
    delay(200);
  } else {
    digitalWrite(13, LOW);
  }
  delay(250);
}
