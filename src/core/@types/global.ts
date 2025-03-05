import {PlatformInfo} from "@/utils/pure/os";

export type AppInfo = {
    platform: PlatformInfo;
    isPackaged: boolean;
};

declare global {
    interface Window {
        NarraLeaf: {
            getPlatform(): Promise<AppInfo>;
            app: {
                terminate(err: string | Error | null): void;
            };
        }
    }
}

export {};
