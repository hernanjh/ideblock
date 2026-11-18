# IdeBlock

[Read in English](README.md)

IdeBlock es un entorno de desarrollo de escritorio, libre y gratuito, para programar
placas compatibles con Arduino y ESP32. Está pensado para chicos que dan sus primeros
pasos y acompaña a adolescentes y adultos que quieren pasar a programar en código real.

> **Estado:** desarrollo inicial. Ya están la base de la aplicación, el soporte de
> idiomas y los ajustes de accesibilidad; el editor de bloques, el editor de código,
> la compilación y el simulador están en construcción. Ver la [hoja de ruta](#hoja-de-ruta).

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

## Placas soportadas (previstas)

Placas compatibles con Arduino Uno, Nano y Mega, y ESP32 DevKit. Más adelante se
sumarán otras como Raspberry Pi Pico y ESP32-C3.

## Hoja de ruta

| Fase | Alcance                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------ |
| 0    | Estructura del repositorio, CI, internacionalización, documentación                                          |
| 1    | Bloques a código, editor de código, compilación y subida, monitor serie, simulador AVR, proyectos y ejemplos |
| 2    | Simulación de ESP32, más componentes, editor de circuitos completo                                           |
| 3    | Conversión de código a bloques                                                                               |
| 4    | Gestor de placas bajo demanda, instaladores firmados, instalador offline para escuelas, más placas           |

## Desarrollo

Requisitos: Node.js 22.12 o superior y npm.

```bash
npm install
npm run dev
```

| Comando                  | Descripción                                                                 |
| ------------------------ | --------------------------------------------------------------------------- |
| `npm run dev`            | Inicia la app con recarga en caliente                                       |
| `npm run lint`           | Ejecuta ESLint                                                              |
| `npm run format`         | Formatea el código con Prettier                                             |
| `npm run typecheck`      | Verifica los tipos de todos los workspaces                                  |
| `npm test`               | Ejecuta los tests unitarios                                                 |
| `npm run test:e2e`       | Compila la app y ejecuta los tests end-to-end                               |
| `npm run package`        | Genera el instalador para la plataforma actual                              |
| `npm run check:licenses` | Verifica que las licencias de las dependencias sean compatibles con GPL-3.0 |

En [CONTRIBUTING.es.md](CONTRIBUTING.es.md) se describe la estructura del proyecto y
las pautas para contribuir.

## Licencia

IdeBlock se distribuye bajo la [Licencia Pública General de GNU v3.0](LICENSE).

Arduino es una marca registrada de Arduino SA. IdeBlock es un proyecto independiente,
sin relación ni aval de Arduino SA. ESP32 es una marca registrada de Espressif Systems.
