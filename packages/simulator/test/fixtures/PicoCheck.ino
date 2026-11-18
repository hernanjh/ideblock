// Exercises the Pico pins the simulator maps: the built-in LED, PWM, an
// analog input and the USB serial port.
void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(15, OUTPUT);
  analogWrite(16, 64);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  digitalWrite(15, HIGH);
  Serial.println(analogRead(A0));
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(15, LOW);
  delay(500);
}
