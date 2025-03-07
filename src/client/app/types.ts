import React from "react";
import {TargetAndTransition} from "motion/react";

export type SplashScreenDefinition = {
    initial?: TargetAndTransition;
    animate?: TargetAndTransition;
    exit?: TargetAndTransition;
    /**
     * The duration of the splash screen in seconds
     *
     * **Note**: this does not include the duration of the enter/exit animations
     */
    duration: number;
    splashScreen: React.ReactNode;
};

export type Meta = {
    story: import("narraleaf-react").Story;
    splashScreen?: SplashScreenDefinition | SplashScreenDefinition[];
}
