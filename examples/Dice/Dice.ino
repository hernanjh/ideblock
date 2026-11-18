const byte DIGIT_SEGMENTS[10] = {
  0b0111111, 0b0000110, 0b1011011, 0b1001111, 0b1100110,
  0b1101101, 0b1111101, 0b0000111, 0b1111111, 0b1101111
};

void showDigit(int firstPin, int number) {
  // Numbers outside 0 to 9 show a dash.
  byte segments = (number >= 0 && number <= 9) ? DIGIT_SEGMENTS[number] : 0b1000000;
  for (int segment = 0; segment < 7; segment++) {
    pinMode(firstPin + segment, OUTPUT);
    digitalWrite(firstPin + segment, bitRead(segments, segment) ? HIGH : LOW);
  }
}

void setup() {
  randomSeed(analogRead(0));
  pinMode(12, INPUT_PULLUP);
}

void loop() {
  if (digitalRead(12) == LOW) {
    showDigit(2, random(1, 7));
    delay(300);
  }
}
