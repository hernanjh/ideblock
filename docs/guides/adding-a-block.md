# Adding a block

[Leer en español](adding-a-block.es.md)

Blocks live in `packages/blocks`. A block is part of a **module**: a plain object
with the block definitions, a code generator for each block and, for blocks that
return a value, the C++ type of that value. Adding a block never requires
changes to the generator core.

## 1. Define the block

Add it to an existing module in `packages/blocks/src/definitions/` or create a
new module file. Definitions use
[Blockly's JSON format](https://developers.google.com/blockly/guides/create-custom-blocks/define-blocks):

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

Use `field_pin` for pins: it only offers pins that exist on the selected board.
`pinKind` is `output`, `digital`, `analog` or `pwm`.

## 2. Write the generator

```ts
generators: {
  led_toggle: (block, generator) => {
    const pin = block.getFieldValue('PIN') as string;
    generator.pinMode(pin, 'OUTPUT');
    return `digitalWrite(${pin}, !digitalRead(${pin}));\n`;
  },
},
```

Statement blocks return a string ending in a new line. Value blocks return
`[code, Order.X]`, where `Order` is the operator precedence of the expression.

The generator offers hooks so blocks stay independent of each other. Each one is
added once, however many blocks ask for it:

| Hook                             | Purpose                                                     |
| -------------------------------- | ----------------------------------------------------------- |
| `generator.pinMode(pin, mode)`   | Adds `pinMode()` to `setup()`                               |
| `generator.useSerial()`          | Adds `Serial.begin(9600)`                                   |
| `generator.addInclude(header)`   | Adds an `#include`                                          |
| `generator.addLibrary(name)`     | Library installed automatically before compiling            |
| `generator.addGlobal(key, code)` | Global declaration                                          |
| `generator.addSetup(key, code)`  | Line at the start of `setup()`                              |
| `generator.addHelper(key, code)` | Helper function                                             |
| `generator.board`                | Selected board, to generate different code per architecture |

## 3. Declare value types

Variables in blocks have no type, so the generator infers a C++ type from the
values assigned to them. Value blocks declare what they produce:

```ts
valueTypes: { light_sensor_read: 'int' },
```

## 4. Add the texts

Add every `IDEBLOCK_` key, without the prefix, to
`packages/i18n/locales/en/blocks.json` and `es/blocks.json`. The tests fail if a
language is missing a key or uses different `%1` placeholders.

## 5. Register and expose the block

- A new module goes in `BLOCK_MODULES` in `packages/blocks/src/modules.ts`.
- Add the block to a category in `packages/blocks/src/toolbox.ts`. Mark it
  `advanced: true` to hide it from beginners until they choose "All blocks".

## 6. Test it

Add a case to `packages/blocks/test/generator.test.ts` that builds a small
program with the block and checks the generated code. Run `npm test`.
