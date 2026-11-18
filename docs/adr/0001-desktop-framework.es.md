# 0001. Electron como framework de escritorio

- Estado: Aceptada
- Fecha: 2026-11-18

## Contexto

IdeBlock necesita una base de escritorio para Windows (prioridad), Linux y macOS que
aloje Blockly, Monaco y un simulador integrado basado en avr8js y wokwi-elements, y
que gestione procesos externos (arduino-cli, QEMU) y puertos serie. Se evaluaron
Electron y Tauri.

Tauri genera instaladores mucho más chicos y usa menos memoria, pero renderiza con el
motor web del sistema operativo: WebView2 en Windows, WebKitGTK en Linux y WKWebView
en macOS. El simulador emula un microcontrolador de 16 MHz en JavaScript, así que el
rendimiento del motor y la consistencia del renderizado importan más que en una app
típica. WebKitGTK es notablemente más lento y su comportamiento varía entre
distribuciones. El soporte de WebDriver de Tauri no cubre macOS, lo que limita los
tests end-to-end. Los equipos con Windows 10 sin conexión y sin WebView2 necesitarían
el runtime incluido en el instalador.

La ventaja de tamaño es chica en la práctica: arduino-cli y el toolchain de AVR
suman unos 200 MB y el toolchain de ESP32 más de 1 GB.

## Decisión

Usar Electron con TypeScript, React y electron-vite. La versión mínima de Windows es
Windows 10.

## Consecuencias

- Un único motor de renderizado y de JavaScript en todas las plataformas, rendimiento
  predecible del simulador y soporte completo de Playwright para tests end-to-end en
  las tres plataformas.
- Un solo lenguaje (TypeScript) en todo el código facilita las contribuciones.
- Mayor uso de memoria que Tauri. El simulador corre en un Web Worker y el consumo se
  mide en equipos modestos durante la Fase 1.
- Electron debe mantenerse actualizado para recibir correcciones de seguridad.
