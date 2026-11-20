# 0010. Paquetes de placas y paquetes sin conexión

- Estado: Aceptada
- Fecha: 2026-11-20

## Contexto

Compilar para una placa necesita su paquete de placa ("core") y, para algunos
bloques, una librería. Desde la Fase 1 se instalan solos la primera vez que hacen
falta, y para eso tiene que haber internet en ese momento. Muchas aulas tienen
poca o ninguna conectividad, y una clase no puede esperar a que se descargue 1 GB
de herramientas del ESP32 en 25 computadoras. La hoja de ruta pedía un gestor de
placas bajo demanda y un instalador offline para escuelas.

Opciones evaluadas para la parte sin conexión:

- **Un instalador con todos los cores adentro.** Simple para las escuelas, pero
  pesa varios gigabytes, hay que rearmarlo en cada versión y para cada
  plataforma, y trae sobre todo cores que una escuela no usa.
- **La caché de descargas de arduino-cli** (`staging`): copiar los archivos
  permite que `core install` funcione sin conexión, pero igual necesita los
  índices de paquetes y repite cada paso de instalación en cada computadora.
- **Una carpeta con los datos instalados**: los cores, las herramientas y los
  índices de paquetes de la carpeta de datos de arduino-cli, más las librerías
  instaladas, copiados tal cual. Instalar es copiar, sin red y sin herramientas
  extra.

## Decisión

- **Archivo → Placas y librerías** lista los paquetes de placas que soporta la
  aplicación, con las placas que trae cada uno, la versión instalada y la más
  nueva, y permite instalarlos, actualizarlos o quitarlos. Otro botón instala
  todas las librerías que pueden usar los bloques. La lista funciona sin
  conexión con los índices guardados.
- Un **paquete sin conexión** es una carpeta llamada
  `ideblock-pack-<plataforma>-<arquitectura>` con `data/` (cores, herramientas,
  índices), `user/libraries/` e `ideblock-pack.json`, que indica la plataforma,
  el procesador, los cores y las librerías. El manifiesto se escribe al final,
  así una copia interrumpida no se toma por un paquete.
- Nunca se copian `inventory.yaml`, que guarda un identificador de instalación,
  ni `tmp/`.
- Al importar se comprueba que el paquete se haya hecho en el mismo sistema
  operativo y procesador, porque las herramientas que trae son programas
  nativos, y después se copia en la carpeta de arduino-cli de la aplicación.
  También se puede elegir la carpeta que contiene el paquete.
- Cada operación usa la misma cola que compilar y subir, porque arduino-cli
  bloquea su carpeta de datos, y después se vacía la caché de compilaciones.
- Cuando una compilación falla porque no se pudo instalar un core o una
  librería, el mensaje ofrece abrir el diálogo.

## Consecuencias

- Un docente prepara una computadora con internet, exporta el paquete a un
  pendrive y lo importa en las demás; en el aula no hace falta nada más.
- Un paquete sirve solo para el mismo sistema operativo y procesador; una escuela
  con computadoras Windows y Linux arma dos.
- El paquete pesa lo que esté instalado (el core del ESP32 solo supera 1 GB), así
  que conviene instalar únicamente las placas que se usan.
- Un instalador para escuelas lleva un paquete en sus recursos (`npm run
package:offline`); la aplicación instalada lo importa la primera vez que se
  abre y recuerda qué paquete importó, así el mismo paquete no se copia dos
  veces.
