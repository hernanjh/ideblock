export type DiagnosticSeverity = 'error' | 'warning';

export interface CompilerDiagnostic {
  /** File name as reported by the compiler, without directories. */
  file: string;
  /** True when the problem is in the user's sketch rather than a library. */
  inSketch: boolean;
  line: number;
  column: number;
  severity: DiagnosticSeverity;
  message: string;
}

const LOCATED = /^(.*?):(\d+):(\d+):\s+(fatal error|error|warning):\s+(.*)$/;
const LINKER = /undefined reference to [`'‘]([^'’]+)['’]/;
const SIZE = /(Sketch too big|text section exceeds available space)/i;

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/** Extracts errors and warnings from gcc and linker output. */
export function parseCompilerOutput(output: string, sketchFile: string): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const seen = new Set<string>();

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    const located = LOCATED.exec(line);
    if (located) {
      const [, path = '', lineNumber = '0', column = '0', severity = 'error', message = ''] =
        located;
      const file = baseName(path);
      const diagnostic: CompilerDiagnostic = {
        file,
        inSketch: file === sketchFile,
        line: Number(lineNumber),
        column: Number(column),
        severity: severity === 'warning' ? 'warning' : 'error',
        message,
      };
      const key = `${file}:${lineNumber}:${column}:${message}`;
      if (!seen.has(key)) {
        seen.add(key);
        diagnostics.push(diagnostic);
      }
      continue;
    }
    const linker = LINKER.exec(line) ?? (SIZE.test(line) ? [line, line] : null);
    if (linker) {
      const message = LINKER.test(line) ? `undefined reference to '${linker[1]}'` : line;
      if (!seen.has(message)) {
        seen.add(message);
        diagnostics.push({
          file: sketchFile,
          inSketch: true,
          line: 0,
          column: 0,
          severity: 'error',
          message,
        });
      }
    }
  }
  return diagnostics;
}
