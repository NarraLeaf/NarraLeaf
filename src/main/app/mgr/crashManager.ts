import { app, dialog } from "electron";
import { App } from "../app";
import { FsFlag } from "@/utils/fsLogger";
import path from "path";
import { AppDataNamespace } from "../app";

export type CrashReport = {
    timestamp: number;
    reason: string | null;
    recoveryDisabled: boolean;
};

export class CrashManager {
    private crashFlag: FsFlag<CrashReport>;
    private crashReport: CrashReport | null = null;
    private initialized: boolean = false;

    constructor(
        private app: App,
    ) {
        this.crashFlag = new FsFlag(path.join(app.getUserDataDir(), AppDataNamespace.flags, "crash"));
    }

    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        this.setupErrorHandlers();
        await this.consumeCrashReport();
    }

    public isInitialized(): boolean {
        return this.initialized;
    }

    private async consumeCrashReport(): Promise<void> {
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
            if (this.app.isPackaged()) {
                dialog.showErrorBox(
                    this.app.translationManager.translate("app:crashed_critical_title"),
                    this.app.translationManager.translate("app:crashed_critical_message") + "\n\n" + reason
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
        this.crashFlag.flagSync({
            timestamp: Date.now(),
            reason: reason ?? null,
            recoveryDisabled: disableRecovery,
        });
        app.quit();
    }

    private formatCrashReason(type: string, detail: string): string {
        return `[${type}] ${detail}`;
    }
}
