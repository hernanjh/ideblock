# 0003. Formato de proyecto

- Estado: Aceptada
- Fecha: 2026-11-18

## Contexto

Un proyecto tiene que guardar los bloques, el código, la placa elegida y el circuito.
El formato debe ser legible, apto para control de versiones y compatible con
arduino-cli y el Arduino IDE. El código del usuario nunca se puede perder al pasar
entre bloques y código.

## Decisión

Un proyecto es una carpeta:

```
Semaforo/
├─ Semaforo.ino        Sketch estándar; arduino-cli exige que coincida con el nombre de la carpeta
├─ ideblock.json       Metadatos: formatVersion, name, board (FQBN), mode ("blocks" | "code")
├─ blocks.json         Serialización del espacio de trabajo de Blockly
└─ circuit.json        Componentes, posiciones y conexiones
```

El campo `mode` define la fuente de verdad:

- En modo `blocks`, `blocks.json` manda y el `.ino` se regenera a partir de él.
- En modo `code`, el `.ino` manda y los bloques se conservan solo como historial.

Si se edita el código generado en modo `blocks`, la app ofrece pasar el proyecto a
modo `code` o descartar la edición; nunca se descarta nada en silencio. Hasta que
exista la conversión de código a bloques (Fase 3), volver de `code` a `blocks` solo
se ofrece mientras el código coincida con lo que generan los bloques, para que no
se pierda ninguna edición.

`formatVersion` permite migraciones futuras. Más adelante se puede sumar un archivo
único `.ideblock` (un zip de la carpeta) para compartir proyectos y entregar tareas.

## Consecuencias

- Cualquier proyecto se abre directamente en el Arduino IDE o con arduino-cli.
- Los archivos JSON se comparan sin problemas en control de versiones.
- Cada cambio de esquema requiere una migración.
