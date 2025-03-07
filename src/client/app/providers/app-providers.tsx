import React from "react";
import {SplashScreenProvider} from "@/client/app/providers/splash-screen-provider";


export default function AppProviders({children}: { children: React.ReactNode }) {
    return (
        <>
            <SplashScreenProvider>
                {children}
            </SplashScreenProvider>
        </>
    );
}
