# Preparar un aula sin internet

[Read in English](offline-classroom.md)

Verificar y subir un programa necesita las herramientas de la familia de la
placa (un "core") y, para los bloques de servo, LCD y NeoPixel, una librería.
IdeBlock las instala la primera vez que se usan, y para eso tiene que haber
internet en ese momento. En un aula sin conexión, preparalas una vez y copialas
a cada computadora.

El simulador no necesita nada de esto: funciona sin internet desde el principio.

## 1. Preparar una computadora

En una computadora con internet y el mismo sistema operativo que las del aula
(Windows con Windows, Linux con Linux):

1. Abrí **Archivo → Placas y librerías**.
2. Instalá las placas que va a usar la clase. Solo esas: las herramientas del
   ESP32 ocupan más de 1 GB.
3. Tocá **Instalar las librerías**.

## 2. Exportar el paquete

En **Archivo → Placas y librerías**, tocá **Exportar a una carpeta…** y elegí un
pendrive o una carpeta compartida. IdeBlock crea una carpeta llamada
`ideblock-pack-<sistema>-<procesador>` con todo lo instalado.

## 3. Importarlo en cada computadora

En cada computadora del aula, abrí **Archivo → Placas y librerías**, tocá
**Importar un paquete…** y elegí la carpeta del paquete, o el pendrive que la
contiene. No se descarga nada.

Si antes de importar se verificó un programa y falló por falta de internet, el
mensaje de error de la consola tiene un botón que abre el mismo diálogo.

## Un instalador con el paquete adentro

Para muchas computadoras, o computadoras que los alumnos reinstalan, el paquete
puede viajar dentro del instalador: la aplicación instalada lo importa la
primera vez que se abre. Armalo en el mismo sistema operativo que el paquete:

```bash
IDEBLOCK_OFFLINE_PACK=/ruta/al/ideblock-pack-linux-x64 npm run package:offline
```

El instalador pesa lo mismo que el paquete. Un paquete más nuevo (exportado
después) se vuelve a importar con un instalador nuevo; el mismo paquete se
importa una sola vez.
