# 0008. Cableado a mano y revisión del circuito

- Estado: Aceptada
- Fecha: 2026-11-18

## Contexto

Hasta la Fase 2 cada componente guardaba el pin de la placa de cada una de sus
patas, y el dibujo trazaba los cables. Es rápido para los más chicos, pero oculta
cómo se arma un circuito de verdad. Los docentes también quieren que los alumnos
usen una protoboard y aprendan por qué un LED necesita una resistencia. El
simulador tiene que seguir usando los mismos modelos de componentes en los dos
casos.

## Decisión

- Un circuito tiene un modo de cableado, guardado como `wiring` en
  `circuit.json`: `auto` (el predeterminado, como antes) o `manual`.
- Con el cableado a mano, los cables se guardan en la lista `connections` que ya
  existía, como `{ id, from, to, color }`. Los terminales se llaman
  `board:<pin>`, `<pieza>:<pata>` o `<protoboard>:<agujero>`.
- Las protoboards y las resistencias son piezas que solo existen con el cableado
  a mano. Una pata que queda a menos de medio agujero de un agujero de la
  protoboard se considera pinchada en él.
- La aplicación arma las redes con una estructura union-find sobre terminales,
  cables, tiras de la protoboard y patas unidas dentro de una pieza. Las arma dos
  veces: una tomando las resistencias como conexiones, para saber a qué pin de la
  placa llega cada pieza, y otra sin ellas, para saber si hay una resistencia en
  serie con un LED.
- Los pines encontrados así se le pasan al simulador, así que los modelos de
  componentes no cambian. Una pieza que no está del todo conectada queda fuera de
  la simulación.
- La revisión del circuito avisa de los cables que faltan, la falta de tierra o
  de alimentación, los cortocircuitos y los LED sin resistencia. Ese LED se quema
  la primera vez que se enciende, hasta que se detiene la simulación.
- Al pasar del cableado automático al manual se crean los cables equivalentes y
  una resistencia delante de cada LED, así el circuito sigue funcionando. Al
  volver se conservan los pines a los que llegaban los cables y los cables
  mismos, para más adelante.

## Consecuencias

- Los proyectos hechos antes de este cambio se abren igual, con cableado
  automático.
- El análisis es eléctrico solo a nivel de conexiones: no calcula corrientes ni
  tensiones, así que condensadores, transistores y diodos no se pueden simular de
  esta forma.
- Las formas de las piezas ahora llevan posiciones de patas que tienen que
  coincidir con el paso de 0,1 pulgada de la protoboard, como explica la guía
  para agregar un componente.
