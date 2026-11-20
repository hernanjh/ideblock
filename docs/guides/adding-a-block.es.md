# Cómo agregar un bloque

[Read in English](adding-a-block.md)

Los bloques están en `packages/blocks`. Cada bloque forma parte de un **módulo**:
un objeto con las definiciones de los bloques, un generador de código por bloque
y, para los bloques que devuelven un valor, el tipo C++ de ese valor. Agregar un
bloque nunca requiere cambiar el núcleo del generador.

## 1. Definir el bloque

Agregalo a un módulo de `packages/blocks/src/definitions/` o creá un archivo de
módulo nuevo. Las definiciones usan el
[formato JSON de Blockly](https://developers.google.com/blockly/guides/create-custom-blocks/define-blocks):

```ts
{
  type: 'led_toggle',
  message0: '%{BKY_IDEBLOCK_LED_TOGGLE}',
  args0: [{ type: 'field_pin', name: 'PIN', pinKind: 'output' }],
  previousStatement: null,
  nextStatement: null,
  colour: COLOURS.outputs,
  tooltip: '%{BKY_IDEBLOCK_LED_TOGGLE_TOOLTIP}',
}
```

Usá `field_pin` para los pines: solo ofrece pines que existen en la placa elegida.
`pinKind` puede ser `output`, `digital`, `analog` o `pwm`.

## 2. Escribir el generador

```ts
generators: {
  led_toggle: (block, generator) => {
    const pin = block.getFieldValue('PIN') as string;
    generator.pinMode(pin, 'OUTPUT');
    return `digitalWrite(${pin}, !digitalRead(${pin}));\n`;
  },
},
```

Los bloques de instrucción devuelven un texto que termina en salto de línea. Los
bloques de valor devuelven `[código, Order.X]`, donde `Order` es la precedencia
del operador de la expresión.

El generador ofrece puntos de enganche para que los bloques no dependan entre sí.
Cada uno se agrega una sola vez, aunque lo pidan varios bloques:

| Enganche                             | Para qué sirve                                                    |
| ------------------------------------ | ----------------------------------------------------------------- |
| `generator.pinMode(pin, modo)`       | Agrega `pinMode()` en `setup()`                                   |
| `generator.useSerial()`              | Agrega `Serial.begin(9600)`                                       |
| `generator.addInclude(cabecera)`     | Agrega un `#include`                                              |
| `generator.addLibrary(nombre)`       | Librería que se instala sola antes de compilar                    |
| `generator.addGlobal(clave, código)` | Declaración global                                                |
| `generator.addSetup(clave, código)`  | Línea al principio de `setup()`                                   |
| `generator.addHelper(clave, código)` | Función auxiliar                                                  |
| `generator.board`                    | Placa elegida, para generar código distinto según la arquitectura |

## 3. Declarar los tipos de valor

Las variables de los bloques no tienen tipo, así que el generador deduce un tipo
C++ a partir de los valores que se les asignan. Los bloques de valor declaran qué
producen:

```ts
valueTypes: { light_sensor_read: 'int' },
```

## 4. Agregar los textos

Agregá cada clave `IDEBLOCK_`, sin el prefijo, en
`packages/i18n/locales/en/blocks.json` y `es/blocks.json`. Los tests fallan si a
un idioma le falta una clave o usa marcadores `%1` distintos.

## 5. Registrar y mostrar el bloque

- Un módulo nuevo va en `BLOCK_MODULES`, en `packages/blocks/src/modules.ts`.
- Agregá el bloque a una categoría en `packages/blocks/src/toolbox.ts`. Marcalo
  con `advanced: true` para ocultarlo a quienes empiezan hasta que elijan
  "Todos los bloques".

## 6. Enseñarle al conversor

El código puede volver a convertirse en bloques (ver
[ADR 0009](../adr/0009-code-to-blocks.es.md)). En
`packages/code-to-blocks/src/convert.ts`, reconocé el código que escribe el
generador para el bloque y armá el bloque a partir de él: las instrucciones en
`callStatement` y los valores en `callValue`. Si el generador escribe `pinMode`
para un pin, llamá a `this.uses(pin, modo)` para que el `pinMode` convertido no
quede repetido. El código que el conversor no reconoce queda en un bloque de
código, así que este paso puede esperar, pero un ejemplo que use el bloque va a
fallar en la prueba de ida y vuelta de
`packages/code-to-blocks/test/examples.test.ts` hasta que esté hecho.

## 7. Probarlo

Agregá un caso en `packages/blocks/test/generator.test.ts` que arme un programa
chico con el bloque y verifique el código generado. Ejecutá `npm test`.
