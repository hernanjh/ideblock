import type { ComponentDefinition } from '../component';
import { photoresistor, potentiometer } from './analog-input';
import { buzzer } from './buzzer';
import { lcd1602 } from './lcd';
import { led, rgbLed } from './led';
import { neopixelRing } from './neopixel';
import { pushbutton } from './pushbutton';
import { servo } from './servo';
import { ultrasonic } from './ultrasonic';

/** Every simulated component. Adding one only requires adding it here. */
export const COMPONENTS: readonly ComponentDefinition[] = [
  led,
  rgbLed,
  pushbutton,
  potentiometer,
  photoresistor,
  servo,
  buzzer,
  ultrasonic,
  lcd1602,
  neopixelRing,
];

export function findComponent(type: string): ComponentDefinition | undefined {
  return COMPONENTS.find((component) => component.type === type);
}
