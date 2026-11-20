import { Language, Parser } from 'web-tree-sitter';

/**
 * Where the WebAssembly files live: a URL in the application, or their bytes
 * where files are read directly (tests, the command line).
 */
export interface ParserFiles {
  /** web-tree-sitter's runtime, web-tree-sitter.wasm. */
  runtime: string | Uint8Array;
  /** The C++ grammar, tree-sitter-cpp.wasm. */
  grammar: string | Uint8Array;
}

let parser: Promise<Parser> | null = null;

/** Loads the parser once; the grammar is about 3.5 MB, so it is only fetched when needed. */
export function loadParser(files: ParserFiles): Promise<Parser> {
  parser ??= (async () => {
    const { runtime } = files;
    await Parser.init(
      typeof runtime === 'string' ? { locateFile: () => runtime } : { wasmBinary: runtime },
    );
    const language = await Language.load(files.grammar);
    const instance = new Parser();
    instance.setLanguage(language);
    return instance;
  })();
  return parser;
}
