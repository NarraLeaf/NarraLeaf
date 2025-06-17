import React, {ReactNode, useContext} from "react";

type ContextType = {};
const context = React.createContext<ContextType | null>(null);

export function Provider({children}: { children?: ReactNode }) {
    "use client";
    return (
        <context.Provider value={{}}>
            {children}
        </context.Provider>
    );
}

export function useContextType(): ContextType {
    const ctx = useContext(context);
    if (!ctx) throw new Error("useContext must be used within a Provider");
    return ctx;
}
