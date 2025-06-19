import * as React from "react";
import { ErrorFallbackProps } from "./errorHandling";

export type ErrorBoundaryProps = {
    children: React.ReactNode;
    fallback?: React.ComponentType<ErrorFallbackProps> | null;
};

export class ErrorBoundary<TProps extends ErrorBoundaryProps = ErrorBoundaryProps> extends React.Component<TProps, {
    hasError: boolean;
}> {
    constructor(props: TProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(
        error: Error,
    ) {
        return { hasError: true };
    }

    /**
     * Handle error behavior. Can be overridden by subclasses to customize error handling.
     * @param error - The error that was caught
     * @param info - React error boundary info containing component stack
     * @protected
     */
    protected handleError(
        error: Error,
        info: {
            componentStack: string;
        }
    ): void {}

    componentDidCatch(
        error: Error,
        info: {
            componentStack: string;
        }
    ) {
        this.handleError(error, info);
    }

    render() {
        if (this.state.hasError) {
            const FallbackComponent = this.props.fallback as React.ComponentType<ErrorFallbackProps>;
            if (!FallbackComponent) {
                return null;
            }

            return <FallbackComponent />;
        }

        return this.props.children;
    }
}

