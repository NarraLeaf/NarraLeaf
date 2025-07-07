import React, {ReactNode, useContext, useState} from "react";

type SplashScreenContextType = {
    finish(): void;
    reset(): void;
    isFinished: boolean;
};

const SplashScreenContext = React.createContext<SplashScreenContextType | null>(null);

export function SplashScreenProvider({children}: { children?: ReactNode }) {
    "use client";
    const [finished, setFinished] = useState<boolean>(false);

    const finish = () => {
        setFinished(true);
    };

    const reset = () => {
        setFinished(false);
    };

    return (
        <SplashScreenContext value={{finish, reset, isFinished: finished}}>
            {children}
        </SplashScreenContext>
    );
}


export function useSplashScreen(): SplashScreenContextType {
    const context = useContext(SplashScreenContext);
    if (!context) throw new Error("useSplashScreen must be used within a SplashScreenProvider");
    return context;
}
