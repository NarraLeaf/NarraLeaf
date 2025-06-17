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
export type EventToken = {
    cancel(): void;
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
    /**
     * The stage to display when the game is running
     * 
     * @example
     * ```tsx
     * export const metadata: GameMetadata = {
     *   stage: (
     *     <div className="...">
     *       <QuickMenu />
     *     </div>
     *   ),
     * }
     * ```
     */
    stage?: React.ReactNode;
    /**
     * The url of the background image to display in the main menu
     * 
     * @example
     * ```tsx
     * export const metadata: GameMetadata = {
     *   backgroundImage: "/your-image.jpg",
     * }
     * ```
     */
    backgroundImage?: string;
};

export {Pages} from "@/client/_app/app";
export {SaveType} from "@core/game/save";
export type {PageConfig} from "@/client/_app/app";
export type {SavedGame, SavedGameMetaData, SavedGameMetaData as SavedGameMetadata} from "narraleaf-react";
export type {UseSavedGameResult, UseSaveActionResult} from "@/client/_app/hooks/game-save";
