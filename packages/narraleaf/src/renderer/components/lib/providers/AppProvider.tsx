import React, {ReactNode, useContext} from "react";
import {App} from "@renderer/app/app";
import type {RendererApp} from "@renderer/app/rendererApp.types";

const context = React.createContext<RendererApp | null>(null);

/** Provides the NarraLeaf renderer {@link App} instance to the React tree (required for {@link useApp}). */
export function AppProvider({children, app}: { children?: ReactNode, app: App; }) {
    return (
        <context.Provider value={app}>
            {children}
        </context.Provider>
    );
}

/**
 * Stable application handle for UI code: navigation, saves, and controlled renderer state.
 *
 * @throws {Error} When called outside an {@link AppProvider}.
 */
export function useApp(): RendererApp {
    const ctx = useContext(context);
    if (!ctx) throw new Error("useApp must be used within a Provider");
    return ctx;
}
