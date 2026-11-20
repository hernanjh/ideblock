# 0009. Convertir código en bloques

- Estado: Aceptada
- Fecha: 2026-11-20

## Contexto

Hasta la Fase 3, editar el código era un camino de ida: cuando un chico cambiaba
el código generado, los bloques dejaban de seguirlo y la única forma de volver
era deshacer los cambios. Los docentes también quieren traer sketches de libros
o de internet y mostrarlos como bloques. Pasar de C++ a bloques necesita un
analizador de verdad: los sketches son C++ con macros, clases y plantillas, y las
expresiones regulares fallan con la primera expresión anidada.

Opciones evaluadas:

- **tree-sitter** con su gramática de C++, compilada a WebAssembly
  (`web-tree-sitter`, MIT; `tree-sitter-cpp`, MIT). Rápido, tolera errores, da
  un árbol sintáctico con posiciones y funciona sin conexión en el renderer.
- **Clang** (libclang o `clang -ast-dump`): exacto, pero es una dependencia
  nativa grande para cada plataforma y necesita los encabezados de la placa
  para poder analizar.
- **Un analizador propio** para un subconjunto de C++: chico, pero todo sketch
  fuera del subconjunto fallaría, y mantener un analizador de C++ es un proyecto
  en sí mismo.

## Decisión

- Un paquete nuevo, `@ideblock/code-to-blocks`, analiza con tree-sitter y
  convierte el árbol en un espacio de trabajo de Blockly en formato JSON.
- `tree-sitter-cpp.wasm` (0.23.4) se guarda en el repositorio con su licencia;
  `web-tree-sitter` viene de npm. Los dos se cargan recién la primera vez que se
  convierte, así el inicio de la aplicación sigue siendo rápido.
- El conversor reconoce lo que escribe el generador de bloques, así que
  bloques → código → bloques da el mismo programa. Las pruebas lo comprueban con
  todos los ejemplos incluidos. El circuito decide entre bloques que escriben el
  mismo código (un `digitalWrite` en el pin de un LED se convierte en el bloque
  del LED; en cualquier otro pin, en el bloque genérico de pines).
- Lo que no tiene un bloque equivalente se conserva, no se pierde: tres
  **bloques de código** grises guardan C++ como texto, como instrucción, como
  valor o al principio del sketch (includes, `#define`, clases, funciones con
  firmas poco comunes). El generador escribe su texto sin cambios, así que un
  sketch convertido compila igual que antes.
- Convertir reemplaza los bloques del proyecto y lo devuelve al modo bloques.
  Antes, la aplicación muestra cuántos bloques se armaron y cuántos quedaron
  como código, y avisa si el código tiene errores de sintaxis.
- La política de seguridad de contenido de producción permite
  `'wasm-unsafe-eval'`, que habilita compilar WebAssembly y nada más; `eval()`
  sigue bloqueado.

## Consecuencias

- El código escrito a mano siempre puede volver a bloques; el resultado es tan
  legible como el código lo permite, y nunca se pierde nada.
- Las variables locales pasan a ser globales, porque los bloques solo tienen
  variables globales. No se conserva el formato; los comentarios dentro de las
  funciones pasan a ser comentarios de bloque.
- Los bloques nuevos tienen que sumarse al conversor cuando se agregan al
  generador; la prueba de ida y vuelta con los ejemplos detecta los que faltan
  cuando un ejemplo los usa.
- La gramática suma unos 3,5 MB al instalador.
