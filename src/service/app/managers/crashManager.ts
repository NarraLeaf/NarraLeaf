import { App } from "../app";
import { FsFlag } from "@/utils/fsLogger";
import path from "path";
import { AppDataNamespace } from "../constants";
import { Manager } from "./manager";
import { RuntimeManager } from "./runtimeManager";

export type CrashReport = {
    timestamp: number;
    reason: string | null;
    recoveryDisabled: boolean;
};

export class CrashManager extends Manager<[RuntimeManager]> {
    public crashFlag: FsFlag<CrashReport> | null = null;
    private crashReport: CrashReport | null = null;

    constructor(
        private app: App,
    ) {
        super();
    }

    protected async init() {
        const [runtimeManager] = this.getDependencies();
        this.crashFlag = new FsFlag(path.join(runtimeManager.getUserDir(), AppDataNamespace.flags, "crash"));

        this.setupErrorHandlers();
        await this.consumeCrashReport();
    }

    private async consumeCrashReport(): Promise<void> {
        this.assertCrashFlag();

        const isCrashed = await this.crashFlag.hasFlag();
        if (!isCrashed) {
            return;
        }

        const report = await this.crashFlag.readFlag();
        await this.crashFlag.unflag();
        this.crashReport = report;

        this.app.logger.error("Crash Report detected: \n" + JSON.stringify(report, null, 2));
    }

    private setupErrorHandlers(): void {
        process.on("uncaughtException", (err) => {
            this.crash(this.formatCrashReason("MainProcessUncaughtException", err.message));
        });

        process.on("unhandledRejection", async (reason) => {
            this.assertCrashFlag();

            const [runtimeManager] = this.getDependencies();

            if (runtimeManager.appMetadata.isPackage) {
                runtimeManager.showErrorDialog(
                    runtimeManager.t("app:crashed_critical_title"),
                    runtimeManager.t("app:crashed_critical_message") + "\n\n" + reason
                );

                this.crash(this.formatCrashReason(
                    "MainProcessUnhandledRejection",
                    reason instanceof Error ? reason.message : String(reason)
                ));
            } else {
                console.error("Unhandled Rejection:", reason);
            }
        });
    }

    public getCrashReport(): CrashReport | null {
        return this.crashReport;
    }

    public crash(reason?: string, { disableRecovery = false }: { disableRecovery?: boolean } = {}): void {
        this.assertCrashFlag();

        const [runtimeManager] = this.getDependencies();

        this.crashFlag.flagSync({
            timestamp: Date.now(),
            reason: reason ?? null,
            recoveryDisabled: disableRecovery,
        });

        runtimeManager.quit(false);
    }

    private formatCrashReason(type: string, detail: string): string {
        return `[${type}] ${detail}`;
    }

    private assertCrashFlag(): asserts this is { crashFlag: FsFlag<CrashReport> } {
        if (!this.crashFlag) {
            throw new Error("Crash flag not initialized");
        }
    }
}
