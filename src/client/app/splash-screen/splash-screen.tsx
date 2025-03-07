import {SplashScreenDefinition} from "@/client/app/types";
import {useSplashScreen} from "@/client/app/providers/splash-screen-provider";
import React, {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "motion/react";

export function SplashScreen(
    {children, splashScreens}: { children: React.ReactNode, splashScreens: null | SplashScreenDefinition[] }
) {
    const {finish, isFinished} = useSplashScreen();
    const [index, setIndex] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const timeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!splashScreens || !splashScreens.length) {
            console.log("[Renderer] SplashScreen: No splash screens provided. Skipping...");
            finish();
            return;
        }

        return () => {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
        };
    }, []);

    if (!splashScreens || !splashScreens.length) {
        return (
            <>
                <AnimatePresence>
                    {children}
                </AnimatePresence>
            </>
        );
    }

    const onSplashScreenComplete = () => {
        const t = setTimeout(() => {
            if (t === timeout.current) {
                timeout.current = null;
            }
            if (index === splashScreens.length - 1) {
                setIsExiting(true);
            } else {
                if (!splashScreens[index].duration) {
                    throw new Error("Splash screen duration must be greater than 0");
                }
                setIndex(index + 1);
            }
        }, splashScreens[index].duration * 1000);
    };

    const onExitComplete = () => {
        if (isExiting) {
            finish();
        }
    };

    return (
        <>
            <AnimatePresence onExitComplete={onExitComplete} mode={"wait"}>
                {isFinished ? (
                    <React.Fragment key={"children"}>
                        {children}
                    </React.Fragment>
                ) : (
                    isExiting ? undefined : (<motion.div
                        key={`splash-screen-${index}`}
                        initial={splashScreens[index].initial}
                        animate={splashScreens[index].animate}
                        exit={splashScreens[index].exit}
                        onAnimationComplete={onSplashScreenComplete}
                        style={{
                            width: "100%",
                            height: "100%",
                        }}
                    >
                        {splashScreens[index].splashScreen}
                    </motion.div>)
                )}
            </AnimatePresence>
        </>
    );
}
