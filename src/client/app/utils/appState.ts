import { Preference } from "narraleaf-react";
import { StringKeyof } from "./types";
import { EventToken } from "@/client/app/app.types";

export class AppState<T extends Record<string, any>> extends Preference<T> {
    constructor(settings: T) {
        super(settings);
    }

    public get<K extends StringKeyof<T>>(key: K): T[K] {
        return this.getPreference(key);
    }

    public getAll(): T {
        return this.getPreferences();
    }

    public set<K extends StringKeyof<T>>(key: K, value: T[K]): void {
        this.setPreference(key, value);
    }

    public onChange<K extends StringKeyof<T>>(key: K, listener: (value: T[K]) => void): EventToken {
        return this.onPreferenceChange(key, listener);
    }
}
