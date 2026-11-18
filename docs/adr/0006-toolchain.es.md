# 0006. Compilación, subida y puerto serie con arduino-cli

- Estado: Aceptada
- Fecha: 2026-11-18

## Contexto

La aplicación tiene que compilar sketches, instalar cores y librerías, detectar
placas, subir firmware y mostrar el monitor serie en Windows, Linux y macOS,
preferentemente sin módulos nativos de Node.js que haya que recompilar para cada
versión de Electron.

## Decisión

- Incluir arduino-cli (GPL-3.0) como ejecutable separado. La versión y el SHA-256
  del archivo de cada plataforma están fijados en `scripts/fetch-arduino-cli.mjs`,
  que se ejecuta antes de empaquetar.
- Ejecutarlo con un archivo de configuración que guarda cores, descargas y
  librerías en la carpeta de datos de la aplicación, para no afectar nunca a un
  Arduino IDE instalado.
- Instalar el core de una placa y las librerías que necesita un sketch la primera
  vez que se usan, mostrando el progreso en la consola.
- Ejecutar las operaciones de arduino-cli de a una, porque bloquea su carpeta de
  datos.
- Detectar los puertos con `board list --watch` e implementar el monitor serie con
  `arduino-cli monitor`, en lugar del módulo nativo `serialport`.
- En Windows, buscar chips USB-serie (CH340, CP210x, FTDI) sin driver con
  `Get-PnpDevice` de PowerShell, y enlazar a los drivers del fabricante.

## Consecuencias

- Sin módulos nativos: el mismo build funciona con cualquier versión de Electron.
- La primera vez que se usa una placa hace falta internet. El instalador offline
  para escuelas (Fase 4) va a incluir los cores preinstalados.
- Los tests de integración que compilan necesitan la herramienta real y se
  activan con `IDEBLOCK_TOOLCHAIN_TESTS=1`.
