import { Menu } from 'electron';

/**
 * macOS needs an application menu for standard editing shortcuts to work; the
 * role-based items are localized by the operating system. Other platforms use
 * the in-app toolbar only.
 */
export function installApplicationMenu(): void {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]),
  );
}
