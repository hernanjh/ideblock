import type { ComponentDefinition } from '../component';
import { photoresistor, potentiometer } from './analog-input';
import { buzzer } from './buzzer';
import { led } from './led';
import { pushbutton } from './pushbutton';
import { servo } from './servo';
import { ultrasonic } from './ultrasonic';

/** Every simulated component. Adding one only requires adding it here. */
export const COMPONENTS: readonly ComponentDefinition[] = [
  led,
  pushbutton,
  potentiometer,
  photoresistor,
  servo,
  buzzer,
  ultrasonic,
];

export function findComponent(type: string): ComponentDefinition | undefined {
  return COMPONENTS.find((component) => component.type === type);
}
