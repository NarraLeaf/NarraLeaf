export type CrashReport = {
    timestamp: number;
    reason: string | null;
    recoveryDisabled: boolean;
};