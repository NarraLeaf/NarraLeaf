import { AppInfo } from "@/core/@types/global";
import { ErrorBoundary, ErrorBoundaryProps } from "./ErrorBoundary";
import { NarraLeafMainWorldProperty } from "@/core/build/constants";
import { CriticalErrorBoundary, CriticalErrorBoundaryProps } from "./CriticalErrorBoundary";
import { RouterErrorFallback } from "./RouterErrorFallback";

interface RouterErrorBoundaryProps extends CriticalErrorBoundaryProps {
    path?: string;
};

export class RouterErrorBoundary extends CriticalErrorBoundary<RouterErrorBoundaryProps> {
    static MINIMUM_RESTART_DELAY = 10;

    constructor(props: RouterErrorBoundaryProps) {
        super({
            ...props,
            fallback: <RouterErrorFallback path={props.path} />,
        });
    }

    protected handleError(error: Error, info: { componentStack: string; }): void {
        console.error(error);

        super.handleError(error, info);
    }
}
