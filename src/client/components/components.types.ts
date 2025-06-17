import { AnimationProps } from "motion/react";
import type { Story } from "narraleaf-react";

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

export type GameMetadata = {
    story: Story;
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