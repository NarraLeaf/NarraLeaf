import React from "react";
import {AnimationProps} from "motion/react";

export type SplashScreenDefinition = {
    initial?: AnimationProps["initial"];
    animate?: AnimationProps["animate"];
    exit?: AnimationProps["exit"];
    /**
     * The duration of the splash screen in seconds
     *
     * **Note**: this does not include the duration of the enter/exit animations
     */
    duration: number;
    splashScreen: React.ReactNode;
};

/**
 * @deprecated Use `GameMetadata` instead
 */
export type Meta = {
    story: import("narraleaf-react").Story;
    splashScreen?: SplashScreenDefinition | SplashScreenDefinition[];
};
export type GameMetadata = {
    story: import("narraleaf-react").Story;
    splashScreen?: SplashScreenDefinition | SplashScreenDefinition[];
};

export {Pages} from "@/client/app/app";
export type {PageConfig} from "@/client/app/app";
