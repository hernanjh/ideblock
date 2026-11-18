# Ideas y notas de investigación

[Read in English](ideas.md)

Notas de trabajo sobre funcionalidades, referencias y riesgos. Son propuestas, no
compromisos; cada una se revisa al cierre de una fase antes de entrar en la hoja de
ruta.

Última revisión: 2026-11-18 (cierre de la Fase 0).

## Panorama

| Producto                         | Bloques               | Simulador                        | Sube a placas          | Sin conexión      | Código abierto    |
| -------------------------------- | --------------------- | -------------------------------- | ---------------------- | ----------------- | ----------------- |
| mBlock 5                         | Sí (Scratch 3)        | No (solo escenario de sprites)   | Sí                     | App de escritorio | No                |
| Tinkercad Circuits               | Sí                    | Sí (Uno, micro:bit)              | No                     | No                | No                |
| PictoBlox                        | Sí (y bloques junior) | No                               | Sí                     | App de escritorio | No                |
| Wokwi                            | No                    | Sí (AVR, ESP32, RP2040, STM32)   | Con VS Code            | Pago              | Solo piezas (MIT) |
| STEAMakersBlocks (ArduinoBlocks) | Sí                    | No                               | Sí, con conector local | No                | No                |
| Velxio                           | No                    | Sí (AVR, RP2040, ESP32 con QEMU) | Sí                     | Imagen Docker     | AGPL-3.0          |
| OpenHW Studio                    | Sí                    | Sí                               | Sí                     | No                | MIT               |
| OpenBlock                        | Sí (Scratch 3)        | No                               | Sí                     | Sí (Electron)     | MIT / BSD         |
| SimulIDE                         | No                    | Sí (AVR, PIC)                    | No                     | Sí                | GPL / AGPL        |

**El hueco que cubre IdeBlock:** ninguna herramienta reúne bloques, simulador con
protoboard, subida a placas reales, uso sin conexión y licencia libre. Ninguna ofrece
simulación de ESP32 con bloques para chicos.

## Ideas de funcionalidades

La prioridad es alta, media o baja. La fase indica dónde encajaría mejor.

### Candidatas a la Fase 1

- **Errores de subida en lenguaje simple (alta).** Puerto ocupado, placa equivocada,
  driver faltante y timeouts son las quejas más frecuentes en los foros de mBlock y
  PictoBlox. Explicarlos en un inglés y un español simples, con una guía paso a paso
  para los drivers CH340 y CP210x.
- **"Mostrar todos los puertos" como alternativa (alta)** cuando falla la detección
  automática, para que el alumno igual pueda elegir uno.
- **Sin placa por defecto (alta).** Los proyectos nuevos abren listos para simular, y el
  mismo proyecto se sube al hardware sin cambios. Es el punto más fuerte de Tinkercad,
  que no puede subir a placas.
- **Resaltado de bloques durante la simulación (alta).** Marcar el bloque que se está
  ejecutando. Muy efectivo entre los 8 y los 12 años, y barato de hacer con avr8js.
- **Entradas interactivas en el simulador (alta).** Botones clicables y deslizadores
  para sensores de distancia, luz y temperatura.
- **Niveles de caja de herramientas (alta).** Paletas de bloques reducidas por lección
  o nivel, para no abrumar a quien empieza.
- **Indicador de tiempo real (media).** Mostrar la velocidad de la simulación respecto
  del tiempo real; la lentitud es una queja conocida de Tinkercad.
- **Galería de ejemplos filtrable por placa, dificultad y tema (alta).** El contenido
  impulsa la adopción.
- **Autoguardado con historial local de versiones (alta).** Los docentes reportan con
  frecuencia trabajos perdidos.

### Candidatas a la Fase 2

- **Validación de circuitos (alta).** Avisar de un LED sin resistencia, un
  cortocircuito o un pin usado dos veces. Enseña seguridad eléctrica.
- **Desafíos autocorregibles (alta).** Comportamiento esperado de pines y del puerto
  serie más verificaciones del circuito, empaquetados en un archivo que reparte el
  docente. La corrección no necesita servidor.
- **Perfiles de kit (alta).** Paletas de bloques y ejemplos para kits educativos comunes
  (kits genéricos de sensores, kits estilo Keyestudio). Así ganó ArduinoBlocks las
  escuelas españolas.
- **Paquetes de bloques y componentes compartibles (alta).** Un formato documentado
  (bloques, generador, dependencias de librerías, pieza simulada) que docentes y
  fabricantes puedan distribuir como un archivo.
- **Gestor de librerías (media)** mediante arduino-cli, con paquetes de bloques que
  declaran sus librerías.
- **Instrumentos virtuales (media):** analizador lógico, vista de osciloscopio de un pin
  y un multímetro simple.
- **Pinout superpuesto y ayudas de cableado (media)** en el editor de circuitos.
- **Bloqueos para el docente (media):** placa fija, ocultar la vista de código,
  restringir la caja de herramientas. Control del aula sin servidor.
- **Importar y exportar `diagram.json` de Wokwi (media)** para aprovechar su gran
  cantidad de ejemplos.
- **Red virtual para ESP32 (media):** Wi-Fi y MQTT simulados para clases de IoT, con un
  tablero local simple.
- **Lecciones alineadas al currículo (media).** Por ejemplo, la materia "Tecnología y
  Digitalización" de la LOMLOE en España y los NAP de programación y robótica en
  Argentina.

### Más adelante

- **Paquetes de aula (media).** Paquetes de consigna que exporta el docente y paquetes de
  entrega (zip) que devuelven los alumnos, con verificación automática. Opcionalmente un
  panel en la red local, sin nube.
- **Exportar la tarea a PDF (media):** circuito, bloques y código en un solo documento.
- **Modo en vivo con Firmata (media)** y un escenario en pantalla donde los sensores de
  la placa controlan un juego, el gran atractivo de mBlock y PictoBlox.
- **Depurador en el simulador (media):** puntos de interrupción, paso a paso y
  observación de variables.
- **Bloques junior solo con íconos (baja)** para 6 a 8 años.
- **Logros locales (baja)** por desafíos completados. Nada sale de la computadora.
- **Más idiomas (media):** portugués, catalán, gallego y euskera, con una plataforma de
  traducción comunitaria.
- **MicroPython para ESP32 (baja)**, como ofrecen BIPES y PictoBlox.
- **Simulación de circuitos analógicos (baja)** con ngspice compilado a WebAssembly.
- **Edición web o PWA (baja)** con Web Serial, para escuelas que usan Chromebooks.

## Diferenciación

1. Bloques, simulador y hardware real en un solo paquete libre, gratuito y sin conexión.
2. Simulación de ESP32 con bloques, pensada para chicos.
3. Privacidad desde el diseño: sin cuentas, sin servicios en la nube, sin telemetría.
   Esto contrasta con las funciones en la nube de otras herramientas y con los
   proyectos gratuitos de Wokwi, que son públicos. También encaja con las normas de
   protección de datos de las escuelas (RGPD, Ley 25.326 de Argentina).
4. Calidad pensada primero en español: interfaz, lecciones y explicación de errores.
5. Resaltado de bloques en vivo y, más adelante, conversión en ambos sentidos.
6. Independiente de cualquier fabricante de hardware.
7. Desafíos autocorregibles y paquetes de aula que funcionan sin servidor.

## Referencias reutilizables

| Proyecto                         | Licencia                   | Uso                                                                                        |
| -------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| avr8js, rp2040js, wokwi-elements | MIT                        | Dependencias directas                                                                      |
| Ardublockly                      | Apache-2.0                 | Definiciones de bloques y generadores como referencia o para reutilizar                    |
| Visualino                        | BSD-2-Clause               | Ideas de bloques; proyecto inactivo                                                        |
| OpenBlock                        | MIT / BSD-3-Clause         | Patrones de integración de Electron y arduino-cli                                          |
| BIPES                            | GPL-3.0                    | Código reutilizable; ideas de MicroPython                                                  |
| OpenHW Studio                    | MIT                        | Validación de circuitos, corrección y funciones de aula                                    |
| Velxio                           | AGPL-3.0                   | Referencia de diseño para simular ESP32 con QEMU; no copiar código sin una decisión aparte |
| SimulIDE                         | GPL / AGPL (no está claro) | Solo como referencia de instrumentos y simulación                                          |

## Riesgos

- **Simulación de ESP32.** El QEMU oficial de Espressif emula la CPU, la UART y la flash,
  pero no GPIO, LEDC (PWM), ADC ni I2C. El fork de lcgamboa agrega esos periféricos, con
  limitaciones: una instancia por proceso, sin BLE, touch ni DAC, y una diferencia de
  versión con arduino-esp32. La alternativa es una librería intermedia que informe la
  actividad de los pines por la UART (más simple, menos fiel). La Fase 2 empieza con una
  prueba de viabilidad.
- **Licencia de QEMU.** QEMU es GPL-2.0. Tiene que ejecutarse como proceso separado y
  nunca enlazarse con la aplicación, porque el código GPL-2.0-only no se puede combinar
  con GPL-3.0. Su código fuente se ofrece junto con los binarios.
- **Imágenes ROM de ESP32** que requiere QEMU: revisar los términos de redistribución de
  Espressif antes de incluirlas.
- **Tamaño de los toolchains.** El core de ESP32 supera 1 GB. Se mitiga con descargas
  bajo demanda y un instalador offline para escuelas (Fase 4).
- **Marcas registradas.**
  - Los dibujos de placas de wokwi-elements pueden incluir los logos de Arduino y
    Espressif; revisarlos y usar dibujos sin marca si hace falta.
  - Evitar nombres parecidos a Arduino, Scratch, Wokwi, Tinkercad o ArduBlock.
  - Verificar que "IdeBlock" esté libre antes de la primera versión pública.
- **Firma de código en Windows.** Los instaladores sin firmar muestran advertencias de
  SmartScreen que espantan a las escuelas. SignPath Foundation firma gratis proyectos de
  código abierto; conviene pedirlo con tiempo.
- **Memoria en computadoras escolares viejas.** Medir el consumo de Electron y del
  simulador en equipos modestos durante la Fase 1.
