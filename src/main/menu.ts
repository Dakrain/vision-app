import { Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron';

const isDev = () =>
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * No app menu bar. macOS always shows one at the top of the screen, so it
   * keeps the bare minimum: the app menu (about / hide / quit), Edit (the
   * copy / paste shortcuts in text fields go through it) and Window.
   * Windows / Linux get none at all: editing shortcuts work without it.
   */
  buildMenu(): Menu | null {
    if (isDev()) {
      this.setupDevelopmentEnvironment();
    }

    if (process.platform !== 'darwin') {
      Menu.setApplicationMenu(null);
      return null;
    }

    const template: MenuItemConstructorOptions[] = [
      { role: 'appMenu' },
      { role: 'editMenu' },
      // Reload / DevTools while developing only.
      ...(isDev() ? [{ role: 'viewMenu' } as MenuItemConstructorOptions] : []),
      { role: 'windowMenu' },
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    return menu;
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          },
        },
      ]).popup({ window: this.mainWindow });
    });
  }
}
