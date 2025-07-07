import { AppInfo } from "@/core/@types/global";
import { ErrorBoundary, ErrorBoundaryProps } from "./ErrorBoundary";
import { NarraLeaf } from "@/core/build/constants";

export interface CriticalErrorBoundaryProps extends ErrorBoundaryProps {
    appInfo: AppInfo;
    children: React.ReactNode;
    initialTimestamp?: number;
};

export class CriticalErrorBoundary<T extends CriticalErrorBoundaryProps> extends ErrorBoundary<T> {
    static MINIMUM_RESTART_DELAY = 10;

    constructor(props: T) {
        super(props);
    }

    protected handleError(error: Error, info: { componentStack: string; }): void {
        const { appInfo } = this.props;

        if (!appInfo.isPackaged && appInfo.config.appErrorHandling === "terminate") {
            console.warn("App is not terminated due to dev mode. In production, the app will be terminated.");
        }

        const isRawErrorHandling = 
            appInfo.config.appErrorHandling === "raw"
            || !appInfo.isPackaged;
        if (isRawErrorHandling) {
            return;
        }

        const forceTerminate =
            appInfo.config.appErrorHandling === "terminate"
            // If the app is crashing too fast, that means the error is happening during the initialization
            || (this.props.initialTimestamp && Date.now() - this.props.initialTimestamp < CriticalErrorBoundary.MINIMUM_RESTART_DELAY);
        if (forceTerminate) {
            window[NarraLeaf].app.terminate(error);
        }

        const shouldRestart = appInfo.config.appErrorHandling === "restart";
        if (shouldRestart) {
            window[NarraLeaf].app.reload();
        }
    }
}
