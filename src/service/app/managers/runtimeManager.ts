import { SidecarRuntimeError } from "@/service/utils/error";
import { RuntimeAppMetadata } from "../ipc/protocol";
import { MainServiceIPCClient } from "../ipc/socket";
import { Manager } from "./manager";

export class RuntimeManager extends Manager<null> {
    public appMetadata: RuntimeAppMetadata | null = null;

    constructor(private ipcClient: MainServiceIPCClient) {
        super();
    }

    async init() {
        if (!this.ipcClient.getStats().connected) {
            await this.ipcClient.connect();
        }

        const metadata = await this.ipcClient.sendRequest<"tauri:app.get_metadata">("tauri:app.get_metadata");
        if (!metadata.success) {
            throw new Error(`Failed to get app metadata: ${metadata.error}`);
        }

        this.appMetadata = metadata.data;
    }

    public getUserDir(): string {
        this.assertAppMetadata();

        return this.appMetadata.userDir;
    }

    private assertAppMetadata(): asserts this is { appMetadata: RuntimeAppMetadata } {
        if (!this.appMetadata) {
            throw new SidecarRuntimeError("App metadata not initialized");
        }
    }
}
