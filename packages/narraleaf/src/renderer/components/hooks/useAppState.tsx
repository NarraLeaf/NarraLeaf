import { useApp } from "@renderer/components/lib/providers/AppProvider";
import { useEffect } from "react";
import { useFlush } from "../lib/utils/flush";
import { AppStates } from "@renderer/app/app";
import { StringKeyof } from "@shared/utils/types";

/**
 * Subscribe to a key on {@link RendererApp.state} (currently `isPlaying`) with tuple setter ergonomics.
 * Unsubscribes on unmount.
 */
export function useAppState<K extends StringKeyof<AppStates>>(key: K): [
    AppStates[K],
    ((value: AppStates[K]) => void) | ((handler: (prev: AppStates[K]) => AppStates[K]) => void)
] {
    const app = useApp();
    const [flush] = useFlush()

    useEffect(() => {
        const token = app.state.onChange(key, () => {
            flush();
        });
        return () => token.cancel();
    }, [app, key, flush]);

    return [app.state.get(key), (value: AppStates[K] | ((prev: AppStates[K]) => AppStates[K])) => {
        if (typeof value === "function") {
            app.state.set<K>(key, value(app.state.get(key)));
        } else {
            app.state.set<K>(key, value);
        }
    }];
}
