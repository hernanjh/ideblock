int count = 0;

void setup() {
  Serial.begin(9600);
  Serial.println("Hello! Let's count.");
}

void loop() {
  Serial.println(count);
  count++;
  delay(1000);
}
