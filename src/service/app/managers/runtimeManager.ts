import { ServiceRuntimeError } from "@/service/utils/error";
import { RuntimeAppMetadata } from "../ipc/protocol";
import { MainServiceIPCClient } from "../ipc/socket";
import { Manager } from "./manager";
import { Translation, TranslationKey } from "./runtime/translation";

export class RuntimeManager extends Manager<null> {
    public _appMetadata: RuntimeAppMetadata | null = null;

    constructor(private ipcClient: MainServiceIPCClient) {
        super();
    }

    public get appMetadata(): RuntimeAppMetadata {
        this.assertAppMetadata();
        return this._appMetadata;
    }

    async init() {
        if (!this.ipcClient.getStats().connected) {
            await this.ipcClient.connect();
        }

        const metadata = await this.ipcClient.sendRuntimeRequest<"tauri:app.get_metadata">("tauri:app.get_metadata");
        if (!metadata.success) {
            throw new Error(`Failed to get app metadata: ${metadata.error}`);
        }

        this._appMetadata = metadata.data;
    }

    public getUserDir(): string {
        this.assertAppMetadata();

        return this.appMetadata.userDir;
    }

    public async showErrorDialog(title: string, message: string): Promise<void> {
        this.assertAppMetadata();

        this.ipcClient.sendRuntimeRequest<"tauri:dialog.message">("tauri:dialog.message", {    
            message,
            options: { title }
        });
    }

    public t(k: TranslationKey): string {
        this.assertAppMetadata();

        return Translation.translate(k, this.appMetadata.preferredSystemLanguage);
    }

    public async quit(ok: boolean = true) {
        const code = ok ? 0 : 1;

        if (this.ipcClient.getStats().connected) {
            await this.ipcClient.sendRuntimeRequest<"tauri:app.quit">("tauri:app.quit");
            await this.ipcClient.close();
            process.exit(code);
        } else {
            process.exit(code);
        }
    }

    private assertAppMetadata(): asserts this is { _appMetadata: RuntimeAppMetadata } {
        if (!this._appMetadata) {
            throw new ServiceRuntimeError("App metadata not initialized");
        }
    }
}
