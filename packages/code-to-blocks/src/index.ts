import type { Parser } from 'web-tree-sitter';
import { convertTree, type ConversionResult, type ConvertOptions } from './convert';
import { loadParser, type ParserFiles } from './parser';

export type { CircuitPart, ConversionResult, ConvertOptions, SerializedBlock } from './convert';
export type { ParserFiles } from './parser';

/** Converts a sketch's C++ to a blocks workspace. */
export async function codeToBlocks(
  code: string,
  options: ConvertOptions & { files: ParserFiles },
): Promise<ConversionResult> {
  const parser: Parser = await loadParser(options.files);
  const tree = parser.parse(code);
  if (!tree) throw new Error('The parser returned no tree');
  try {
    return convertTree(tree, options);
  } finally {
    tree.delete();
  }
}
