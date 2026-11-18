# 0004. Internacionalización

- Estado: Aceptada
- Fecha: 2026-11-18

## Contexto

La interfaz tiene que estar en inglés y en español desde el inicio, seguir por defecto
el idioma del sistema y permitir que la comunidad sume idiomas (el portugués es el
próximo candidato).

## Decisión

- i18next con react-i18next. Las traducciones están en
  `packages/i18n/locales/<idioma>/` como JSON, un archivo por espacio de nombres.
- El inglés es el idioma de referencia y de respaldo.
- La preferencia de idioma es `system`, `en` o `es`. Con `system`, se toma el idioma
  de la interfaz que informa Electron y los idiomas preferidos del sistema operativo,
  comparando la subetiqueta principal (`es-AR` se resuelve como `es`).
- Los tests fallan si a algún idioma le falta una clave, tiene un valor vacío o
  cambia los marcadores de interpolación. ESLint rechaza textos literales en JSX.
- Los mensajes de Blockly y las explicaciones de errores de compilación usarán los
  mismos archivos cuando se incorporen.

## Consecuencias

- Sumar un idioma es una tarea de traducción sin cambios de código, salvo registrar
  el código del idioma.
- Las claves de traducción se verifican por tipos en la interfaz.
