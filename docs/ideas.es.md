# Ideas y notas de investigación

[Read in English](ideas.md)

Notas de trabajo sobre funcionalidades, referencias y riesgos. Son propuestas, no
compromisos; cada una se revisa al cierre de una fase antes de entrar en la hoja de
ruta.

Última revisión: 2026-11-20 (cierre de la Fase 3).

## Revisión de la Fase 3

Hecho: un analizador de C++ (tree-sitter, [ADR 0009](adr/0009-code-to-blocks.es.md))
y un conversor que vuelve a pasar a bloques el código escrito a mano, un archivo
`.ino` abierto o un sketch de un libro. El código sin un bloque equivalente queda
en bloques grises de código, así que un sketch convertido siempre compila igual
que antes. El conversor usa el circuito para elegir bloques de componentes, y
entiende nombres dados a los pines (`const int ledPin = 13;`, `#define`), la
librería `LiquidCrystal_I2C`, que es la más común, y los ejemplos clásicos (Blink,
Fade, Button, Sweep, Knob, AnalogReadSerial). Todos los ejemplos incluidos
vuelven a dar exactamente el mismo código. El aviso de programa y circuito que no
coinciden ahora también funciona con código escrito a mano. Los números
demasiado grandes para un `int` de 16 bits ahora usan `long`.

Ideas nuevas de esta fase:

- **Agregar de una vez todas las piezas que faltan (alta).** Después de convertir
  o abrir un sketch, el circuito suele estar vacío y el aviso ofrece las piezas de
  a una; un solo botón podría ubicarlas todas.
- **Bloques para lo que los sketches clásicos todavía dejan como código (media):**
  `delayMicroseconds`, `pulseIn`, `tone` con duración y sin pausa, y
  `digitalWrite` con un nivel variable.
- **Conservar los comentarios (media).** tree-sitter ve los comentarios; podrían
  pasar a ser comentarios de bloque en lugar de perderse.
- **Pegar C++ en el editor de bloques (media)** para convertir solo ese pedazo.
- **Mostrar qué líneas quedan como código (baja)** marcándolas en el editor antes
  de convertir.
- **Variables locales en bloques (baja).** Los bloques solo tienen variables
  globales, así que las locales convertidas pasan a ser globales.

## Revisión de la Fase 2

Hecho hasta ahora: caché de firmware, más placas (Leonardo, Micro, Nano Every,
ESP32-C3 y S3, ESP8266 y Pico), un bus I2C en el simulador con una pantalla LCD,
LED RGB, anillos NeoPixel, interruptores, sensores de movimiento, inclinación y
temperatura, cableado a mano en una protoboard con resistencias y revisión del
circuito ([ADR 0008](adr/0008-hand-wiring.es.md)), un aviso cuando el programa y
el circuito no coinciden, el LED de la placa y cada bloque que se ejecuta
iluminado por turno, la simulación del Arduino Mega, los pines I2C a la vista en
los bloques de la LCD, un display de 7 segmentos y un joystick. La simulación del ESP32 pasó a la Fase 4 (ver Riesgos).

Notas nuevas de pruebas de uso y de la comparación con Tinkercad y mBlock:

- **Selector de color en los bloques (hecho).** Los bloques de LED RGB y NeoPixel
  usan muestras de color de `@blockly/field-colour` (Apache-2.0), con el nombre de
  cada color al pasar el mouse.
- **Simulación eléctrica (baja).** Condensadores, diodos, transistores, pilas y
  un multímetro, como en Tinkercad, necesitan calcular corrientes y tensiones,
  cosa que el análisis de conexiones no hace.
- **Motores (media).** Motores de vibración y de corriente continua manejados por
  un pin o un módulo con transistor; wokwi-elements no tiene dibujos para ellos,
  así que hay que hacerlos.
- **Más piezas de wokwi-elements (media).** Joystick, display de 7 segmentos,
  barra de LED, sensores de sonido, llama y gas y una pantalla OLED tienen dibujo
  y encajan con los modelos actuales.
- **Simular las placas que faltan.** Uno, Nano, Mega, Leonardo, Micro y Pico ya
  corren en el simulador. Falta:
  - En la Pico, servos, tonos y NeoPixel: arduino-pico los maneja con PIO, que
    rp2040js ejecuta aparte del reloj simulado. Leer las colas FIFO del PIO a
    más alto nivel (ancho de pulso, período del tono, colores) lo resolvería.
  - En Leonardo y Micro, el PWM de los pines 6 y 13 (timer 4) y el puerto serie
    USB; las compilaciones para simular mandan Serial a la USART1.
  - Nano Every (ATmega4809): avr8js no emula la serie megaAVR 0.
  - ESP8266: [digitake/esp8266-emulator](https://github.com/digitake/esp8266-emulator)
    (C, MIT) corre imágenes del core de Arduino 3.1.2 sin modificar y se maneja
    con JSON por stdin/stdout, con GPIO, UART y temporizadores FRC, que el core
    también usa para PWM por software, tonos, servo e I2C. No tiene ADC, sus
    tiempos son ideales y en Windows solo corre dentro de WSL, así que habría que
    adaptarlo. Todavía no se compiló ni se probó; candidato para la Fase 4 junto
    con el ESP32.
- **Bloques con duración (hecho en parte).** Ya existe "encender el LED durante N
  segundos"; los tonos y los colores RGB podrían tener la misma forma.

## Revisión de la Fase 1

De las candidatas de abajo, en la Fase 1 se hicieron: errores de compilación y de
subida en lenguaje simple, la opción "mostrar todos los puertos", la guía de
drivers CH340, CP210x y FTDI en Windows, el resaltado de bloques durante la
simulación, las entradas interactivas del simulador, los niveles básico y avanzado
de la caja de herramientas, el aviso de simulación lenta, la galería de ejemplos,
el autoguardado y la recuperación de la sesión. Además, el simulador puede abrirse
en una ventana aparte.

Notas nuevas que surgieron al construirlo:

- **Tamaño al iniciar.** Monaco hace que el bundle principal pese unos 9 MB.
  Cargar el editor de código recién cuando se muestra su panel aceleraría el
  inicio en computadoras viejas.
- **Simulación que arranca más rápido.** Iniciar el simulador compila el sketch.
  El firmware se podría guardar en caché según el código y la placa, para que
  reiniciar un programa sin cambios sea instantáneo.
- **Cableado visual.** Los componentes se conectan eligiendo pines de una lista.
  Una vista de protoboard con cables (Fase 2) necesita dibujos de placas sin
  marcas registradas.
- **Simulación del Mega.** avr8js puede emular el ATmega2560 con sus puertos y
  timers adicionales; sería un paso chico después de la Fase 1.
- **Prueba con hardware.** Durante el desarrollo no se pudo probar la subida en
  placas reales. Antes de publicar, probar un Uno original, un clon Nano con CH340
  y bootloader viejo, y un ESP32 DevKit que necesita el botón BOOT.
- **macOS.** Los builds sin firmar quedan bloqueados por Gatekeeper; la
  notarización necesita una cuenta de desarrollador de Apple.

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
- **Programa y circuito que no coinciden (alta).** Avisar cuando un bloque maneja una
  pieza que no está en el circuito en ese pin, por ejemplo bloques de NeoPixel en un
  pin conectado a un LED común. Surgió en las primeras pruebas de uso.
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

- **Simulación de ESP32 (pasa a la Fase 4).** Una prueba de viabilidad en la Fase 2
  encontró:
  - El QEMU 9.2.2 de Espressif arranca imágenes de arduino-esp32 3.3 y corre sketches
    que usan el puerto serie, pero descarta las escrituras a GPIO, no permite inyectar
    entradas y se cuelga en `analogRead`.
  - El fork de lcgamboa (máquina `esp32-picsimlab`) emula GPIO, LEDC, ADC, I2C y SPI.
    Con un parche de ~60 líneas (dos correcciones de flash traídas de Espressif, duty
    de LEDC legible, ADC como línea de entrada, consultas por qtest) un proceso aparte
    pudo ver un LED, apretar un botón, girar un potenciómetro y leer el PWM por qtest.
  - El fork lo mantiene una sola persona, va atrasado respecto de Espressif y no
    publica binarios.
  - Los binarios oficiales de macOS y Linux dependen de Homebrew o de librerías del
    sistema, así que QEMU hay que compilarlo para cada plataforma de todos modos.
  - Una librería intermedia que reemplaza los símbolos débiles `digitalWrite`,
    `digitalRead` y `analogRead` funciona con el binario sin modificar, pero no cubre
    LEDC, RMT ni librerías que no pasan por la API de Arduino.
  - Esfuerzo estimado: 4–5 semanas con el fork parcheado, 1–2 con la librería.
  - **Decisión:** se posterga a la Fase 4, junto con el gestor de placas y los instaladores.
    En ese momento el camino preferido es el fork parcheado, compilado por plataforma en
    CI. Las notas y el parche están en
    [research/esp32-qemu](research/esp32-qemu/README.es.md).
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
