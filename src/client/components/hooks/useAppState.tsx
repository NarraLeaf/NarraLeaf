import { useApp } from "@/client";
import { useEffect } from "react";
import { useFlush } from "../lib/utils/flush";
import { AppStates } from "@/client/app/app";
import { StringKeyof } from "@/client/app/utils/types";

export function useAppState<K extends StringKeyof<AppStates>>(key: K): [
    AppStates[K],
    ((value: AppStates[K]) => void) | ((handler: (prev: AppStates[K]) => AppStates[K]) => void)
] {
    const app = useApp();
    const [flush] = useFlush()

    useEffect(() => {
        app.state.onChange(key, () => {
            flush();
        });
    }, [app, key, flush]);

    return [app.state.get(key), (value: AppStates[K] | ((prev: AppStates[K]) => AppStates[K])) => {
        if (typeof value === "function") {
            app.state.set<K>(key, value(app.state.get(key)));
        } else {
            app.state.set<K>(key, value);
        }
    }];
}
