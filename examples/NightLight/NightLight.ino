void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
}

void loop() {
  Serial.println(analogRead(A0));
  if (analogRead(A0) < 300) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
  delay(200);
}
