import { createReadStream, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';

// The dev server needs inline scripts for hot reload, so the strict policy is
// only injected into production builds.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // The C++ parser that turns code into blocks is WebAssembly; this allows
  // compiling WebAssembly only, not eval() of JavaScript.
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'ideblock-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}

const BLOCKLY_MEDIA_URL = 'blockly-media';
const blocklyMediaDir = join(dirname(createRequire(import.meta.url).resolve('blockly')), 'media');

/**
 * Blockly loads its cursors and icons from a media folder that defaults to a
 * remote URL. Serving a local copy keeps the editor working offline.
 */
function blocklyMedia(): Plugin {
  return {
    name: 'ideblock-blockly-media',
    configureServer(server) {
      server.middlewares.use(`/${BLOCKLY_MEDIA_URL}`, (req, res, next) => {
        const file = (req.url ?? '').split('?')[0]?.replace(/^\//, '') ?? '';
        if (!readdirSync(blocklyMediaDir).includes(file)) return next();
        createReadStream(join(blocklyMediaDir, file)).pipe(res);
      });
    },
    generateBundle() {
      for (const file of readdirSync(blocklyMediaDir)) {
        this.emitFile({
          type: 'asset',
          fileName: `${BLOCKLY_MEDIA_URL}/${file}`,
          source: readFileSync(join(blocklyMediaDir, file)),
        });
      }
    },
  };
}

export default defineConfig({
  main: {
    build: {
      externalizeDeps: false,
    },
  },
  preload: {
    build: {
      // Sandboxed preload scripts cannot load modules, so everything is bundled
      // into a single CommonJS file.
      externalizeDeps: false,
      isolatedEntries: true,
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
      },
    },
  },
  renderer: {
    root: resolve(import.meta.dirname, 'src/renderer'),
    plugins: [react(), contentSecurityPolicy(), blocklyMedia()],
    build: {
      rollupOptions: {
        input: resolve(import.meta.dirname, 'src/renderer/index.html'),
      },
    },
  },
});
