# 0002. Monorepo con workspaces de npm

- Estado: Aceptada
- Fecha: 2026-11-18

## Contexto

Los bloques, los generadores de código, las definiciones de placas, los componentes
simulados y el formato de proyecto tienen que poder probarse sin Electron y la
comunidad tiene que poder extenderlos sin tocar el núcleo de la aplicación.

## Decisión

Usar un único repositorio con workspaces de npm: `apps/desktop` para la app Electron y
`packages/*` para módulos independientes. Los paquetes exportan directamente el código
TypeScript y electron-vite los empaqueta, sin un paso de build por paquete. La
aplicación empaqueta todas las dependencias JavaScript; el campo `dependencies` de
`apps/desktop` queda reservado para módulos nativos que deban distribuirse sin
empaquetar.

Los paquetes se crean cuando una funcionalidad los necesita, no por adelantado.

## Consecuencias

- La lógica pura (generadores, modelos de componentes, formato de proyecto) se prueba
  en Node sin iniciar Electron.
- npm es la única herramienta necesaria, sin otro gestor de paquetes.
- Las versiones de las dependencias se fijan exactas (`save-exact`) y quedan
  registradas en `package-lock.json`.
