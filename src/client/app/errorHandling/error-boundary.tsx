import * as React from "react";
import {NarraLeafMainWorldProperty} from "@core/build/constants";


export class ErrorBoundary extends React.Component<{
    children: React.ReactNode;
    fallback: React.ReactNode;
    crash: boolean;
}, {
    hasError: boolean;
}> {
    constructor(props: {
        children: React.ReactNode;
        fallback: React.ReactNode;
        crash: boolean;
    }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(
        error: Error,
    ) {
        return { hasError: true };
    }

    componentDidCatch(
        error: Error,
        info: {
            componentStack: string;
        }
    ) {
        if (this.props.crash) {
            const message = `${error.name}: ${error.message}\nComponent Stack: ${info.componentStack}`;

            window[NarraLeafMainWorldProperty].app.terminate(message);
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }

        return this.props.children;
    }
}
