#include <Servo.h>

Servo servo_9;

void setup() {
  servo_9.attach(9);
}

void loop() {
  servo_9.write(constrain(map(analogRead(A0), 0, 1023, 0, 180), 0, 180));
  delay(20);
}
