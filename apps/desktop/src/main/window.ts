import { join } from 'node:path';
import { BrowserWindow, shell } from 'electron';

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'mailto:']);

function openExternalSafely(url: string): void {
  try {
    if (ALLOWED_EXTERNAL_PROTOCOLS.has(new URL(url).protocol)) {
      void shell.openExternal(url);
    }
  } catch {
    // Malformed URLs are ignored.
  }
}

interface WindowOptions {
  /** Renderer view to show; the main window shows the full editor. */
  view?: 'simulator';
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

export function createMainWindow(isDev: boolean): BrowserWindow {
  return createAppWindow(isDev, { width: 1280, height: 800, minWidth: 960, minHeight: 600 });
}

export function createAppWindow(isDev: boolean, options: WindowOptions): BrowserWindow {
  const window = new BrowserWindow({
    width: options.width,
    height: options.height,
    minWidth: options.minWidth,
    minHeight: options.minHeight,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  window.once('ready-to-show', () => window.show());

  // Links never open inside the app; trusted ones go to the system browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafely(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault();
      openExternalSafely(url);
    }
  });

  if (isDev) {
    window.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') {
        window.webContents.toggleDevTools();
      }
    });
  }

  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  const hash = options.view ?? '';
  if (isDev && devServerUrl) {
    void window.loadURL(hash ? `${devServerUrl}#${hash}` : devServerUrl);
  } else {
    void window.loadFile(join(import.meta.dirname, '../renderer/index.html'), { hash });
  }

  return window;
}
