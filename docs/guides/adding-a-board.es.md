# Cómo agregar una placa

[Read in English](adding-a-board.md)

Las placas se describen en `packages/boards/src/definitions.ts`. Una definición
le indica al resto de la aplicación cómo compilar para la placa, qué pines tiene y
si se puede simular.

```ts
export const leonardo: BoardDefinition = {
  id: 'leonardo',
  name: 'Arduino Leonardo',
  fqbn: 'arduino:avr:leonardo',
  architecture: 'avr',
  family: 'arduino',
  core: { id: 'arduino:avr' },
  servo: { header: 'Servo.h', library: 'Servo' },
  drawing: 'uno',
  pinLabelPrefix: 'D',
  digitalPins: [...range(0, 13), 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
  analogInputPins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
  pwmPins: ['3', '5', '6', '9', '10', '11', '13'],
  builtinLedPin: '13',
  usbIds: [{ vid: '2341', pid: '8036' }],
};
```

| Campo                                       | Significado                                                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `fqbn`                                      | Nombre completo de la placa que usa arduino-cli                                                                                  |
| `core`                                      | Plataforma de arduino-cli que se instala la primera vez que se usa la placa; `indexUrl` agrega un índice de paquetes de terceros |
| `digitalPins`, `analogInputPins`, `pwmPins` | Pines que se ofrecen en los menús de los bloques y en el simulador, escritos como en el código                                   |
| `builtinLedPin`                             | Pin por defecto de los bloques de LED                                                                                            |
| `usbIds`                                    | Permite reconocer la placa cuando se conecta                                                                                     |
| `simulation`                                | Solo para placas que el simulador soporta (por ahora el ATmega328P)                                                              |

Después:

1. Agregá la definición a `BOARDS`, en el mismo archivo.
2. Si algunos bloques necesitan código distinto en la nueva arquitectura, usá
   `generator.board.architecture` en sus generadores.
3. Ejecutá `npm test`: los tests de placas verifican que cada pin PWM, analógico y
   de LED exista en la placa.
