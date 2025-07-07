import React, {ReactNode, useContext} from "react";
import {App} from "@/client/app/app";

type ContextType = App;
const context = React.createContext<ContextType | null>(null);

export function AppProvider({children, app}: { children?: ReactNode, app: App; }) {
    return (
        <context.Provider value={app}>
            {children}
        </context.Provider>
    );
}

export function useApp(): ContextType {
    const ctx = useContext(context);
    if (!ctx) throw new Error("useApp must be used within a Provider");
    return ctx;
}
