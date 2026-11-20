# 0009. Converting code to blocks

- Status: Accepted
- Date: 2026-11-20

## Context

Until Phase 3, editing the code was a one-way trip: once a child changed the
generated code, the blocks stopped following it and the only way back was to
undo the changes. Teachers also want to bring in sketches found in books or on
the web and show them as blocks. Turning C++ into blocks needs a real parser:
Arduino sketches are C++ with macros, classes and templates, and regular
expressions break on the first nested expression.

Options considered:

- **tree-sitter** with its C++ grammar, compiled to WebAssembly
  (`web-tree-sitter`, MIT; `tree-sitter-cpp`, MIT). Fast, error-tolerant,
  gives a concrete syntax tree with positions, and runs offline in the
  renderer.
- **Clang** (libclang or `clang -ast-dump`): exact, but a large native
  dependency per platform, and it needs the board's headers to parse at all.
- **A hand-written parser** for a C++ subset: small, but every sketch outside
  the subset would fail, and maintaining a C++ parser is a project by itself.

## Decision

- A new package, `@ideblock/code-to-blocks`, parses with tree-sitter and turns
  the tree into a Blockly workspace in JSON form.
- `tree-sitter-cpp.wasm` (0.23.4) is kept in the repository with its license;
  `web-tree-sitter` comes from npm. Both are loaded only the first time a
  conversion runs, so starting the app stays fast.
- The converter recognises what the block generator writes, so blocks → code →
  blocks gives the same program. Every bundled example is checked this way in
  the tests. The circuit decides between blocks that write the same code (a
  `digitalWrite` on an LED's pin becomes the LED block, on any other pin the
  generic pin block).
- Anything without a matching block is kept, not dropped: three grey **code
  blocks** hold C++ as text, as a statement, as a value or at the top of the
  sketch (includes, `#define`, classes, functions with unusual signatures).
  The generator writes their text back unchanged, so a converted sketch always
  compiles as before.
- Converting replaces the project's blocks and returns it to blocks mode. The
  app shows how many blocks were made and how many stayed as code before it
  does, and warns when the code has syntax errors.
- The production content security policy allows `'wasm-unsafe-eval'`, which
  permits compiling WebAssembly and nothing else; `eval()` stays blocked.

## Consequences

- Hand-written code can always come back to blocks; the result is as readable
  as the code allows, never lossy.
- Local variables become global ones, since blocks only have global variables.
  Formatting and comments are not kept.
- New blocks should be added to the converter when they are added to the
  generator; the round-trip test over the examples catches the ones that are
  missing when an example uses them.
- The grammar adds about 3.5 MB to the installer.
