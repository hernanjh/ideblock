# Cómo contribuir a IdeBlock

[Read in English](CONTRIBUTING.md)

Gracias por ayudar a mejorar IdeBlock. Todo tipo de contribución es bienvenida:
código, traducciones, ejemplos, material didáctico, reportes de errores e ideas.

## Reglas básicas

- Respeto ante todo. IdeBlock lo usan chicos y docentes; los issues, el código y el
  contenido tienen que ser apropiados para ese público.
- Sin telemetría, analíticas ni conexiones que envíen datos del usuario. Toda función
  que necesite la red tiene que funcionar sin conexión o degradarse con elegancia.
- Toda dependencia debe tener una licencia compatible con GPL-3.0 (MIT, BSD,
  Apache-2.0, ISC, MPL-2.0, LGPL, GPL). Después de agregar una, ejecutá
  `npm run check:licenses` y mencioná la licencia en el pull request.
- Los programas GPL externos (arduino-cli, QEMU) se ejecutan como procesos separados;
  nunca se enlazan con la aplicación.
- No usar "Arduino" ni otras marcas registradas en nombres de producto, logos ni
  identificadores. Decir "compatible con Arduino" en descripciones está bien.

## Estructura del proyecto

```
apps/desktop/          Aplicación Electron
  src/main/            Proceso principal: ventanas, ajustes, herramientas externas
  src/preload/         Puente seguro entre el proceso principal y la interfaz
  src/renderer/        Interfaz de usuario (React)
  e2e/                 Tests end-to-end (Playwright)
packages/shared/       Contratos IPC, tipos y esquemas compartidos
packages/i18n/         Archivos de traducción y utilidades de idioma
packages/blocks/       Definiciones de bloques y generador de sketches C++
packages/boards/       Definiciones de placas
packages/compiler/     Mensajes del compilador y de subida explicados en lenguaje simple
packages/project/      Formato de proyecto
packages/simulator/    Emulación AVR y componentes simulados
examples/              Proyectos de ejemplo incluidos en la aplicación
docs/adr/              Registros de decisiones de arquitectura
docs/guides/           Guías para extender IdeBlock
scripts/               Scripts de build y mantenimiento
```

Guías:

- [Cómo agregar un bloque](docs/guides/adding-a-block.es.md)
- [Cómo agregar un componente simulado](docs/guides/adding-a-component.es.md)
- [Cómo agregar una placa](docs/guides/adding-a-board.es.md)

## Primeros pasos

```bash
npm install
npm run dev
```

Antes de abrir un pull request, ejecutá:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

En Linux sin pantalla, ejecutá los tests end-to-end con `xvfb-run -a npm run test:e2e`.

### Tests que compilan

Los tests que compilan sketches reales se saltean por defecto, porque necesitan
arduino-cli y la primera vez descargan el core AVR. Para ejecutarlos:

```bash
npm run fetch:toolchain
IDEBLOCK_TOOLCHAIN_TESTS=1 IDEBLOCK_ARDUINO_DATA_DIR=/ruta/a/cache npm test
IDEBLOCK_TOOLCHAIN_TESTS=1 IDEBLOCK_ARDUINO_DATA_DIR=/ruta/a/cache npm run test:e2e
```

`IDEBLOCK_ARDUINO_DATA_DIR` conserva los cores instalados entre ejecuciones.

### Ejemplos

El archivo `.ino` de cada ejemplo tiene que coincidir con lo que generan sus
bloques; un test lo verifica. Después de cambiar bloques o generadores,
actualizalos con `UPDATE_EXAMPLES=1 npx vitest run packages/blocks/test/examples.test.ts`.

## Estilo de código

- TypeScript en modo estricto. Prettier y ESLint definen el estilo.
- El código fuente, los identificadores y los comentarios se escriben en inglés.
- Los comentarios explican el _porqué_ cuando no es obvio; evitá comentarios que
  repiten lo que dice el código.
- La comunicación entre la interfaz y el proceso principal pasa por el contrato
  tipado de `packages/shared/src/ipc.ts`. Nunca expongas APIs de Node.js o Electron
  directamente a la interfaz.

## Traducciones

- Ningún texto visible está escrito directamente en el código. Los textos van en
  `packages/i18n/locales/<idioma>/`.
- Cada clave tiene que existir en todos los idiomas; los tests lo verifican.
- Para agregar un idioma, copiá la carpeta `en`, traducí los valores, registrá el
  idioma en `packages/i18n/src/index.ts` y agregá su nombre en `language` en todos los
  archivos de traducción.

## Commits y pull requests

- Usá [Conventional Commits](https://www.conventionalcommits.org/es/) en inglés:
  `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`.
- Commits chicos y enfocados en un solo cambio.
- Agregá o actualizá tests cuando cambie el comportamiento.
- Las decisiones de arquitectura importantes se registran en `docs/adr/` en ambos
  idiomas.

## Reportar errores

Abrí un issue con los pasos para reproducirlo, el comportamiento esperado y el real,
el sistema operativo, la versión de IdeBlock y, si corresponde, el modelo de placa.

## Licencia

Al contribuir, aceptás que tus contribuciones se distribuyan bajo la Licencia Pública
General de GNU v3.0.
