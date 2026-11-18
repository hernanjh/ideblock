#define Serial Serial1
#line 1
// Exercises the Leonardo pins the simulator maps: the built-in LED on 13 (port
// C), PWM on a timer 1 pin and a timer 3 pin, an analog input and the serial port.
void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
  analogWrite(9, 192);
  analogWrite(5, 64);
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println(analogRead(A0));
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
