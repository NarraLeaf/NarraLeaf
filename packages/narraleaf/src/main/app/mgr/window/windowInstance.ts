import { BrowserWindow, WebPreferences } from "electron";

export interface WindowInstanceConfig {
    isolated: boolean;
    preload: string;
    options?: Electron.BrowserWindowConstructorOptions;
}

export interface WindowUserInterface {
    show(): Promise<void>;
    loadURL(url: string): Promise<void>;
    loadFile(file: string): Promise<void>;
    setTitle(title: string): void;
    getTitle(): string;
    setIcon(icon: string): void;
    isFullScreen(): boolean;
    enterFullScreen(): void;
    exitFullScreen(): void;
    getWebContents(): Electron.WebContents;
    reload(): void;
    close(): void;
    isClosed(): boolean;
}

export class WindowInstance implements WindowUserInterface {
    private win: BrowserWindow;

    constructor(config: WindowInstanceConfig) {
        this.win = new BrowserWindow({
            webPreferences: this.getWebPreference(config),
            ...config.options,
        });
    }

    public async show(): Promise<void> {
        await this.win.show();
    }

    public loadURL(url: string): Promise<void> {
        return this.win.loadURL(url);
    }

    public loadFile(file: string): Promise<void> {
        return this.win.loadFile(file);
    }

    public setTitle(title: string): void {
        this.win.setTitle(title);
    }

    public getTitle(): string {
        return this.win.getTitle();
    }

    public setIcon(icon: string): void {
        this.win.setIcon(icon);
    }

    public isFullScreen(): boolean {
        return this.win.isFullScreen();
    }

    public enterFullScreen(): void {
        this.win.setFullScreen(true);
    }

    public exitFullScreen(): void {
        this.win.setFullScreen(false);
    }

    public getWebContents() {
        return this.win.webContents;
    }

    public reload(): void {
        this.win.reload();
    }

    public close(): void {
        this.win.close();
    }

    public getBrowserWindow(): BrowserWindow {
        return this.win;
    }

    public isClosed(): boolean {
        return this.win.isDestroyed();
    }

    private getWebPreference(config: WindowInstanceConfig): WebPreferences {
        return {
            contextIsolation: config.isolated,
            preload: config.preload,
        };
    }
} 