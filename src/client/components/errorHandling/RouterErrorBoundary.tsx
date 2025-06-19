import { AppInfo } from "@/core/@types/global";
import { ErrorBoundary, ErrorBoundaryProps } from "./ErrorBoundary";
import { NarraLeaf } from "@/core/build/constants";
import { CriticalErrorBoundary, CriticalErrorBoundaryProps } from "./CriticalErrorBoundary";
import { RouterErrorFallback } from "./RouterErrorFallback";

interface RouterErrorBoundaryProps extends CriticalErrorBoundaryProps {
    path?: string;
};

export class RouterErrorBoundary extends CriticalErrorBoundary<RouterErrorBoundaryProps> {
    static MINIMUM_RESTART_DELAY = 10;

    constructor(props: RouterErrorBoundaryProps) {
        super(props);
    }

    protected handleError(error: Error, info: { componentStack: string; }): void {
        console.error(error);

        super.handleError(error, info);
    }

    render() {
        if (this.state.hasError) {
            const FallbackComponent = this.props.fallback || RouterErrorFallback;
            return <FallbackComponent path={this.props.path} />;
        }

        return this.props.children;
    }
}
