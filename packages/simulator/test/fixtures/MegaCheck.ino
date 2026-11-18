// Exercises the Mega pins the simulator maps: the built-in LED on 13,
// PWM on a timer 3 pin and a timer 2 pin, a pin on port A, an analog input
// and the serial port.
void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
  pinMode(22, OUTPUT);
  analogWrite(2, 64);
  analogWrite(9, 192);
}

void loop() {
  digitalWrite(13, HIGH);
  digitalWrite(22, HIGH);
  Serial.println(analogRead(A0));
  delay(500);
  digitalWrite(13, LOW);
  digitalWrite(22, LOW);
  delay(500);
}
