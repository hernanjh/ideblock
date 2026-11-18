# 0005. Aislamiento de procesos e IPC tipado

- Estado: Aceptada
- Fecha: 2026-11-18

## Contexto

El proceso principal va a ejecutar herramientas externas (arduino-cli, QEMU) y acceder
al sistema de archivos y a los puertos serie. La interfaz muestra proyectos del usuario
y, en el futuro, extensiones de la comunidad. Una interfaz comprometida no debe obtener
acceso al sistema.

## Decisión

- Las ventanas de la interfaz corren con `contextIsolation`, `sandbox` y sin
  `nodeIntegration`. Las versiones de producción aplican una Content Security Policy
  estricta.
- El script de preload expone un único objeto `window.ideblock` con `invoke` y `on`,
  limitado a una lista de canales permitidos.
- Los canales y los tipos de sus argumentos y resultados se declaran una sola vez en
  `packages/shared/src/ipc.ts`. Los handlers del proceso principal se tipan contra el
  mismo contrato y los datos recibidos se validan con zod.
- Se bloquea la navegación fuera de la app; los enlaces externos se abren en el
  navegador del sistema y solo para URLs `https:` y `mailto:`.
- Los programas GPL externos se ejecutan como procesos hijos y nunca se enlazan.

## Consecuencias

- Agregar un canal requiere actualizar el contrato, lo que mantiene sincronizados el
  proceso principal, el preload y la interfaz en tiempo de compilación.
- La interfaz no puede usar módulos de Node.js; todo acceso al sistema pasa por el
  proceso principal.
