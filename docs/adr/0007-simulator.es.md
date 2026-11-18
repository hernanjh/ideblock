# 0007. Arquitectura del simulador

- Estado: Aceptada
- Fecha: 2026-11-18

## Contexto

El simulador tiene que ejecutar el programa que escribió el usuario, no una
aproximación, reaccionar a entradas como botones y perillas, mantenerse fluido en
computadoras escolares modestas y poder usarse en una ventana aparte.

## Decisión

- Compilar el sketch con el toolchain real y ejecutar el firmware resultante en
  avr8js (MIT), que emula el ATmega328P del Uno y el Nano.
- Ejecutar el emulador en un Web Worker en tiempo real, recuperando como máximo
  50 ms por paso, y enviar un cuadro con el estado de los componentes unas 30
  veces por segundo.
- Modelar cada componente como un módulo autocontenido en `packages/simulator` que
  solo ve pines, voltajes y ciclos de CPU. Medir el tiempo en ciclos de CPU hace
  que el brillo por PWM, los pulsos del servo, los tonos y los ecos ultrasónicos
  sean precisos.
- Para los programas de bloques, compilar el firmware del simulador con una
  llamada antes de cada instrucción que escribe el índice del bloque en los
  registros GPIOR0 y GPIOR1. El simulador observa esos registros para resaltar el
  bloque que se está ejecutando. El código que ve el usuario y el que se sube a
  las placas nunca contiene esas llamadas.
- Dibujar los componentes con wokwi-elements (MIT). No se usan los dibujos de
  placas, porque pueden incluir marcas registradas.
- La ventana aparte del simulador es solo una vista: la simulación sigue
  corriendo en la ventana principal y el proceso principal retransmite el estado
  y las acciones del usuario entre ambas ventanas.

## Consecuencias

- El comportamiento coincide con el de las placas reales, incluidos los tiempos,
  porque se ejecuta el mismo código compilado.
- Iniciar una simulación requiere compilar, lo que lleva unos segundos.
- El Mega 2560 y el ESP32 todavía no se simulan; la simulación del ESP32 está
  prevista para la Fase 2.
- La velocidad medida es de alrededor de 1,4 veces el tiempo real en la máquina
  de desarrollo; un aviso le indica al usuario cuando una computadora no llega.
