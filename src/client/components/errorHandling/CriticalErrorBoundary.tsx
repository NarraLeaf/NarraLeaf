import { AppInfo } from "@/core/@types/global";
import { ErrorBoundary, ErrorBoundaryProps } from "./ErrorBoundary";
import { NarraLeafMainWorldProperty } from "@/core/build/constants";

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
            window[NarraLeafMainWorldProperty].app.terminate(error);
        }

        const shouldRestart = appInfo.config.appErrorHandling === "restart";
        if (shouldRestart) {
            window[NarraLeafMainWorldProperty].app.restart();
        }
    }
}
