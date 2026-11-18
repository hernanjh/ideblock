import { COLOURS } from '../colours';
import { Order } from '../generator/order';
import type { BlockModule } from '../types';

const DISTANCE_HELPER = `long readDistanceCm(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  // Sound travels 1 cm in about 29 microseconds and the echo covers it twice.
  long duration = pulseIn(echoPin, HIGH, 30000);
  return duration / 58;
}`;

const TEMPERATURE_HELPER = `float readTemperatureC(int pin) {
  // 10 kOhm NTC thermistor (beta 3950) in a divider with a 10 kOhm resistor.
  int reading = analogRead(pin);
  if (reading <= 0 || reading >= 1023) return -273.15;
  float kelvin = 1.0 / (log(1.0 / (1023.0 / reading - 1.0)) / 3950.0 + 1.0 / 298.15);
  return kelvin - 273.15;
}`;

/** A module whose output pin is HIGH while something is true. */
function digitalSensor(type: string, message: string, defaultPin: string) {
  return {
    type,
    message0: `%{BKY_IDEBLOCK_${message}}`,
    args0: [{ type: 'field_pin', name: 'PIN', pinKind: 'digital', value: defaultPin }],
    output: 'Boolean',
    colour: COLOURS.sensors,
    tooltip: `%{BKY_IDEBLOCK_${message}_TOOLTIP}`,
  };
}

const readHigh: BlockModule['generators'][string] = (block, generator) => {
  const pin = block.getFieldValue('PIN') as string;
  generator.pinMode(pin, 'INPUT');
  return [`digitalRead(${pin}) == HIGH`, Order.EQUALITY];
};

export const sensorsModule: BlockModule = {
  id: 'sensors',
  blocks: [
    {
      type: 'button_pressed',
      message0: '%{BKY_IDEBLOCK_BUTTON_PRESSED}',
      args0: [{ type: 'field_pin', name: 'PIN', pinKind: 'digital' }],
      output: 'Boolean',
      colour: COLOURS.sensors,
      tooltip: '%{BKY_IDEBLOCK_BUTTON_PRESSED_TOOLTIP}',
    },
    {
      type: 'potentiometer_read',
      message0: '%{BKY_IDEBLOCK_POTENTIOMETER}',
      args0: [{ type: 'field_pin', name: 'PIN', pinKind: 'analog' }],
      output: 'Number',
      colour: COLOURS.sensors,
      tooltip: '%{BKY_IDEBLOCK_POTENTIOMETER_TOOLTIP}',
    },
    {
      type: 'light_sensor_read',
      message0: '%{BKY_IDEBLOCK_LIGHT_SENSOR}',
      args0: [{ type: 'field_pin', name: 'PIN', pinKind: 'analog' }],
      output: 'Number',
      colour: COLOURS.sensors,
      tooltip: '%{BKY_IDEBLOCK_LIGHT_SENSOR_TOOLTIP}',
    },
    digitalSensor('switch_on', 'SWITCH_ON', '4'),
    digitalSensor('motion_detected', 'MOTION', '7'),
    digitalSensor('tilt_detected', 'TILT', '5'),
    {
      type: 'temperature_read',
      message0: '%{BKY_IDEBLOCK_TEMPERATURE}',
      args0: [{ type: 'field_pin', name: 'PIN', pinKind: 'analog', value: 'A2' }],
      output: 'Number',
      colour: COLOURS.sensors,
      tooltip: '%{BKY_IDEBLOCK_TEMPERATURE_TOOLTIP}',
    },
    {
      type: 'ultrasonic_distance',
      message0: '%{BKY_IDEBLOCK_ULTRASONIC}',
      args0: [
        { type: 'field_pin', name: 'TRIG', pinKind: 'output' },
        { type: 'field_pin', name: 'ECHO', pinKind: 'digital' },
      ],
      output: 'Number',
      colour: COLOURS.sensors,
      tooltip: '%{BKY_IDEBLOCK_ULTRASONIC_TOOLTIP}',
    },
  ],
  generators: {
    button_pressed: (block, generator) => {
      const pin = block.getFieldValue('PIN') as string;
      // The internal pull-up avoids an external resistor: the button connects
      // the pin to GND, so a press reads LOW.
      generator.pinMode(pin, 'INPUT_PULLUP');
      return [`digitalRead(${pin}) == LOW`, Order.EQUALITY];
    },
    potentiometer_read: (block) => [
      `analogRead(${block.getFieldValue('PIN') as string})`,
      Order.POSTFIX,
    ],
    light_sensor_read: (block) => [
      `analogRead(${block.getFieldValue('PIN') as string})`,
      Order.POSTFIX,
    ],
    switch_on: readHigh,
    motion_detected: readHigh,
    tilt_detected: readHigh,
    temperature_read: (block, generator) => {
      generator.addHelper('readTemperatureC', TEMPERATURE_HELPER);
      return [`readTemperatureC(${block.getFieldValue('PIN') as string})`, Order.POSTFIX];
    },
    ultrasonic_distance: (block, generator) => {
      const trig = block.getFieldValue('TRIG') as string;
      const echo = block.getFieldValue('ECHO') as string;
      generator.pinMode(trig, 'OUTPUT');
      generator.pinMode(echo, 'INPUT');
      generator.addHelper('readDistanceCm', DISTANCE_HELPER);
      return [`readDistanceCm(${trig}, ${echo})`, Order.POSTFIX];
    },
  },
  valueTypes: {
    button_pressed: 'bool',
    potentiometer_read: 'int',
    light_sensor_read: 'int',
    ultrasonic_distance: 'long',
    switch_on: 'bool',
    motion_detected: 'bool',
    tilt_detected: 'bool',
    temperature_read: 'float',
  },
};
