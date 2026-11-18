long distance = 0;

long readDistanceCm(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  // Sound travels 1 cm in about 29 microseconds and the echo covers it twice.
  long duration = pulseIn(echoPin, HIGH, 30000);
  return duration / 58;
}

void setup() {
  Serial.begin(9600);
  pinMode(9, OUTPUT);
  pinMode(10, INPUT);
}

void loop() {
  distance = readDistanceCm(9, 10);
  Serial.println(distance);
  if (distance > 0 && distance < 50) {
    tone(8, 880, 50);
    delay(50);
    delay(distance * 10);
  } else {
    delay(200);
  }
}
