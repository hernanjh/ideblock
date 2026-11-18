# Cómo agregar un componente simulado

[Read in English](adding-a-component.md)

Un componente simulado tiene dos partes:

- **Comportamiento**, en `packages/simulator/src/components/`: qué pines de la
  placa usa y cómo reacciona al firmware que se está ejecutando. Corre dentro del
  worker de la simulación y no tiene acceso a la interfaz.
- **Aspecto**, en `apps/desktop/src/renderer/src/simulator/catalog.ts`: el dibujo
  de [wokwi-elements](https://github.com/wokwi/wokwi-elements) y el control con el
  que interactúa el usuario.

## 1. Modelar el comportamiento

```ts
import type { ComponentDefinition } from '../component';

export const vibrationMotor: ComponentDefinition = {
  type: 'vibration-motor',
  pins: [{ name: 'signal', kind: 'output', defaultPin: '6' }],
  create(instance, context) {
    const pin = instance.pins['signal'] ?? '6';
    let running = context.readPin(pin);
    context.onPin(pin, (high) => {
      running = high;
    });
    return { snapshot: () => ({ running }) };
  },
};
```

El `context` da acceso a la placa simulada:

| Miembro                        | Para qué sirve                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `onPin(pin, listener)`         | Se llama con el nuevo nivel y el ciclo de CPU cuando el programa cambia un pin |
| `readPin(pin)`                 | Nivel actual de un pin                                                         |
| `setDigitalInput(pin, alto)`   | Maneja un pin de entrada, como lo haría un botón o un sensor                   |
| `setAnalogInput(pin, voltios)` | Fija el voltaje que lee `analogRead()`                                         |
| `schedule(callback, ciclos)`   | Ejecuta código después de algunos ciclos de CPU, para señales temporizadas     |
| `cycles()`, `frequency`        | Tiempo simulado, para medir pulsos                                             |

`snapshot()` se ejecuta una vez por cuadro y devuelve lo que dibuja la interfaz.
Los componentes que controla el usuario implementan `input()` y declaran
`initialInput`.

Registrá la definición en `COMPONENTS`, en
`packages/simulator/src/components/index.ts`.

## 2. Describir el aspecto

En `catalog.ts`, asociá el tipo de componente con una etiqueta de wokwi-elements,
el tipo de control y las propiedades del elemento en cada cuadro. Los controles
que aparecen en la tarjeta del componente son:

| Control       | Uso                                                                  |
| ------------- | -------------------------------------------------------------------- |
| `press`       | Se mantiene apretado, como un botón (`pressed`)                      |
| `motion`      | Se mantiene apretado para activar un sensor de movimiento (`motion`) |
| `toggle`      | Encendido y apagado, como un interruptor (`on`)                      |
| `slider`      | Un valor de 0 a 1023 (`value`)                                       |
| `distance`    | Una distancia en centímetros (`distance`)                            |
| `temperature` | Una temperatura en °C (`temperature`)                                |
| `none`        | Solo salidas                                                         |

En `apps/desktop/src/renderer/src/circuit/geometry.ts`, agregá la forma que usan
el dibujo del circuito y el cableado a mano:

- `width`, `height` y `pins`: salen del `pinInfo` del elemento, en píxeles.
- `signals`: qué pin del elemento usa cada pin simulado; `ground` y `supply`: las
  patas que van a GND y a 5V o 3V3.
- `resistors`: la pieza necesita una resistencia en serie (los LED).
- `bridges`: patas unidas por dentro; `swappable`: la señal y la tierra funcionan
  en cualquier orden.
- `rotation`: un cuarto de vuelta, para que las patas entren en la protoboard.

Las patas separadas 0,1 pulgada (9,6 px) entran en los agujeros de la
protoboard. Dibujá un ícono para la paleta en `ComponentIcon.tsx`.

## 3. Agregar los bloques y los textos

Si hay bloques que manejan la pieza, agregalos en
`packages/blocks/src/definitions/` y asocialos con la pieza en
`packages/blocks/src/parts.ts`, así el simulador avisa cuando el programa usa una
pieza que el circuito no tiene.

Agregá el nombre del componente en `components`, su descripción en
`componentInfo`, los nombres de pines nuevos en `componentPins` y los de patas en
`legs`, en `packages/i18n/locales/*/common.json`.

## 4. Probarlo

Agregá un caso en `packages/simulator/test/simulation.test.ts`. Los tests ejecutan
firmware real: compilá un sketch chico para Arduino Uno y guardá su `.hex` en
`packages/simulator/test/fixtures/`, como explica el README de esa carpeta.
