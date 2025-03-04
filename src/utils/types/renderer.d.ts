declare global {
    interface Window {
        NarraLeaf: {
            getPlatform(): Promise<{ platform: PlatformInfo }>;
        }
    }
}
