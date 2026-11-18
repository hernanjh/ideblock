/**
 * Splits a stream of concatenated JSON objects, such as the output of
 * `arduino-cli board list --watch --json`, into individual values.
 */
export class JsonObjectStream {
  private buffer = '';
  private depth = 0;
  private inString = false;
  private escaped = false;
  private start = -1;

  push(chunk: string): unknown[] {
    const values: unknown[] = [];
    const offset = this.buffer.length;
    this.buffer += chunk;

    for (let index = offset; index < this.buffer.length; index++) {
      const char = this.buffer[index];
      if (this.inString) {
        if (this.escaped) this.escaped = false;
        else if (char === '\\') this.escaped = true;
        else if (char === '"') this.inString = false;
        continue;
      }
      if (char === '"') {
        this.inString = true;
      } else if (char === '{') {
        if (this.depth === 0) this.start = index;
        this.depth++;
      } else if (char === '}' && this.depth > 0) {
        this.depth--;
        if (this.depth === 0 && this.start >= 0) {
          const text = this.buffer.slice(this.start, index + 1);
          try {
            values.push(JSON.parse(text));
          } catch {
            // A malformed object is skipped; the next one parses on its own.
          }
          this.start = -1;
        }
      }
    }

    if (this.depth === 0) {
      this.buffer = '';
    } else if (this.start > 0) {
      this.buffer = this.buffer.slice(this.start);
      this.start = 0;
    }
    return values;
  }
}
