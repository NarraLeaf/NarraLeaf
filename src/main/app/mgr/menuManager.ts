import { Menu, MenuItemConstructorOptions } from "electron";
import { App } from "../app";
import { translate } from "@/main/i18n/translate";

type MenuRole = MenuItemConstructorOptions['role'];
type MenuItemType = MenuItemConstructorOptions['type'];

export class MenuManager {
    private menu: Menu | null = null;
    private readonly t: (key: string) => string;

    constructor(private readonly app: App) {
        this.t = translate(this.app);
    }

    public initialize(): void {
        this.buildMenu();
    }

    public buildMenu(): Menu {
        const template: MenuItemConstructorOptions[] = this.buildMenuTemplate();
        this.menu = Menu.buildFromTemplate(template);
        this.setMenu(this.menu);
        return this.menu;
    }

    public updateMenu(): void {
        if (this.menu) {
            this.buildMenu();
        }
    }

    public setMenu(menu: Menu): void {
        Menu.setApplicationMenu(menu);
    }

    private buildMenuTemplate(): MenuItemConstructorOptions[] {
        const isMac = process.platform === 'darwin';

        const template: MenuItemConstructorOptions[] = [
            // File menu
            {
                label: this.t('menu:file'),
                submenu: [
                    {
                        label: this.t('menu:new_game'),
                        accelerator: 'CmdOrCtrl+N',
                        click: () => {
                            // TODO: Implement new game
                        }
                    },
                    { type: 'separator' as MenuItemType },
                    {
                        label: this.t('menu:save'),
                        accelerator: 'CmdOrCtrl+S',
                        click: () => {
                            // TODO: Implement save
                        }
                    },
                    {
                        label: this.t('menu:load'),
                        accelerator: 'CmdOrCtrl+O',
                        click: () => {
                            // TODO: Implement load
                        }
                    },
                    { type: 'separator' as MenuItemType },
                    isMac ? { role: 'close' as MenuRole } : { role: 'quit' as MenuRole }
                ]
            },
            // Edit menu
            {
                label: this.t('menu:edit'),
                submenu: [
                    { role: 'undo' as MenuRole },
                    { role: 'redo' as MenuRole },
                    { type: 'separator' as MenuItemType },
                    { role: 'cut' as MenuRole },
                    { role: 'copy' as MenuRole },
                    { role: 'paste' as MenuRole },
                    { role: 'delete' as MenuRole },
                    { type: 'separator' as MenuItemType },
                    { role: 'selectAll' as MenuRole }
                ]
            },
            // View menu
            {
                label: this.t('menu:view'),
                submenu: [
                    { role: 'reload' as MenuRole },
                    { role: 'forceReload' as MenuRole },
                    { role: 'toggleDevTools' as MenuRole },
                    { type: 'separator' as MenuItemType },
                    { role: 'resetZoom' as MenuRole },
                    { role: 'zoomIn' as MenuRole },
                    { role: 'zoomOut' as MenuRole },
                    { type: 'separator' as MenuItemType },
                    { role: 'togglefullscreen' as MenuRole }
                ]
            },
            // Window menu (macOS only)
            ...(isMac ? [{
                label: this.t('menu:window'),
                submenu: [
                    { role: 'minimize' as MenuRole },
                    { role: 'zoom' as MenuRole },
                    { type: 'separator' as MenuItemType },
                    { role: 'front' as MenuRole },
                    { type: 'separator' as MenuItemType },
                    { role: 'window' as MenuRole }
                ]
            }] : []),
            // Help menu
            {
                label: this.t('menu:help'),
                submenu: [
                    {
                        label: this.t('menu:about'),
                        click: () => {
                            // TODO: Show about dialog
                        }
                    },
                    {
                        label: this.t('menu:check_for_updates'),
                        click: () => {
                            // TODO: Check for updates
                        }
                    }
                ]
            }
        ];

        return template;
    }

    public cleanup(): void {
        this.menu = null;
    }
} 