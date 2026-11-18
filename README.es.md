# IdeBlock

[Read in English](README.md)

IdeBlock es un entorno de desarrollo de escritorio, libre y gratuito, para programar
placas compatibles con Arduino y ESP32. Está pensado para chicos que dan sus primeros
pasos y acompaña a adolescentes y adultos que quieren pasar a programar en código real.

> **Estado:** Fase 1 (primera versión utilizable). Ver la [hoja de ruta](#hoja-de-ruta).

## Qué se puede hacer hoy

- **Bloques y código lado a lado.** Mostrá los bloques, el código o ambos, y
  cambiá su tamaño. El código se actualiza mientras movés los bloques, y en
  cualquier momento podés pasar un proyecto a C++ escrito a mano.
- **Simulador.** Ejecutá el programa en un Arduino Uno o Nano simulado con LED,
  botones, potenciómetros, sensores de luz, servos, buzzers y sensores
  ultrasónicos. El bloque que se está ejecutando se ilumina. El simulador puede
  abrirse en una ventana aparte.
- **Vista de circuito.** Mirá la placa con cada componente y sus cables, mové los
  componentes, cambiales el nombre y los pines. Aparece un aviso cuando dos
  componentes comparten un pin.
- **Placas reales.** Verificá, subí el programa y usá el monitor serie y el
  gráfico con placas compatibles con Arduino Uno, Nano, Mega y ESP32. Las
  herramientas de cada placa se instalan la primera vez que hacen falta.
- **Ayuda en lenguaje simple.** Los errores de compilación y de subida más comunes
  se explican en un español o inglés simple, con un enlace a la línea.
- **Proyectos.** Los proyectos se guardan solos, se abren en el Arduino IDE y se
  pueden abrir sketches `.ino` comunes. Nueve ejemplos van desde un LED que
  parpadea hasta un sensor de estacionamiento.

## Objetivos

- **Bloques o código.** Programar con bloques visuales o escribir C++ directamente,
  y pasar de uno a otro.
- **Simulador integrado.** Probar circuitos y programas sin hardware, ejecutando el
  firmware compilado real.
- **Placas reales.** Compilar, subir el programa y abrir el monitor serie en placas
  físicas.
- **Funciona sin internet.** Pensado para aulas con poca o ninguna conectividad.
- **Inglés y español** desde el primer día, preparado para sumar más idiomas.
- **Privacidad ante todo.** Sin cuentas, sin telemetría, sin recolección de datos.

## Placas soportadas

Placas compatibles con Arduino Uno, Nano, Mega, Leonardo, Micro y Nano Every, ESP32
DevKit, ESP32-C3 y ESP32-S3, NodeMCU y Wemos D1 mini (ESP8266), y Raspberry Pi Pico. El
simulador corre programas de Uno y Nano.

## Hoja de ruta

| Fase | Alcance                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------ |
| 0    | Estructura del repositorio, CI, internacionalización, documentación                                          |
| 1    | Bloques a código, editor de código, compilación y subida, monitor serie, simulador AVR, proyectos y ejemplos |
| 2    | Más componentes, editor de circuitos completo                                                                |
| 3    | Conversión de código a bloques                                                                               |
| 4    | Simulación de ESP32, gestor de placas bajo demanda, instaladores firmados, instalador offline para escuelas  |

## Desarrollo

Requisitos: Node.js 22.12 o superior y npm.

```bash
npm install
npm run fetch:toolchain
npm run dev
```

| Comando                   | Descripción                                                                 |
| ------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`             | Inicia la app con recarga en caliente                                       |
| `npm run lint`            | Ejecuta ESLint                                                              |
| `npm run format`          | Formatea el código con Prettier                                             |
| `npm run typecheck`       | Verifica los tipos de todos los workspaces                                  |
| `npm test`                | Ejecuta los tests unitarios                                                 |
| `npm run test:e2e`        | Compila la app y ejecuta los tests end-to-end                               |
| `npm run package`         | Genera el instalador para la plataforma actual                              |
| `npm run check:licenses`  | Verifica que las licencias de las dependencias sean compatibles con GPL-3.0 |
| `npm run fetch:toolchain` | Descarga la versión fijada de arduino-cli que se usa para compilar y subir  |

En [CONTRIBUTING.es.md](CONTRIBUTING.es.md) se describe la estructura del proyecto y
las pautas para contribuir.

## Licencia

IdeBlock se distribuye bajo la [Licencia Pública General de GNU v3.0](LICENSE).

Arduino es una marca registrada de Arduino SA. IdeBlock es un proyecto independiente,
sin relación ni aval de Arduino SA. ESP32 es una marca registrada de Espressif Systems.
