void setup() {
  Serial.begin(9600);
  pinMode(2, INPUT_PULLUP);
  pinMode(13, OUTPUT);
}

void loop() {
  Serial.println(String(map(analogRead(A0), 0, 1023, -100, 100)) + String(" ") + String(map(analogRead(A1), 0, 1023, -100, 100)));
  if (digitalRead(2) == LOW) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
  delay(100);
}
