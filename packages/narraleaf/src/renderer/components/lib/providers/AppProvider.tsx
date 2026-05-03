import React, {ReactNode, useContext} from "react";
import {App} from "@renderer/app/app";
import type {RendererApp} from "@renderer/app/rendererApp.types";

const context = React.createContext<RendererApp | null>(null);

export function AppProvider({children, app}: { children?: ReactNode, app: App; }) {
    return (
        <context.Provider value={app}>
            {children}
        </context.Provider>
    );
}

export function useApp(): RendererApp {
    const ctx = useContext(context);
    if (!ctx) throw new Error("useApp must be used within a Provider");
    return ctx;
}
