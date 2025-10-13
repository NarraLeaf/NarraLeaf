import type { StringKeyof } from "@/shared/utils/types";
import type { AppEventToken } from "@/main/app/types";

export type HookToken = {
    cancel(): void;
}

export type HookCallback = () => void;

export class Hooks {
    private hooks: Map<string, Set<HookCallback>> = new Map();
    private onceHooks: Map<string, Set<HookCallback>> = new Map();

    /**
     * Register a hook that can be triggered multiple times
     * @param name Hook name
     * @param callback Callback function
     * @returns Token to cancel the hook
     */
    hook(name: string, callback: HookCallback): HookToken {
        if (!this.hooks.has(name)) {
            this.hooks.set(name, new Set());
        }
        this.hooks.get(name)!.add(callback);

        return {
            cancel: () => {
                const callbacks = this.hooks.get(name);
                if (callbacks) {
                    callbacks.delete(callback);
                    if (callbacks.size === 0) {
                        this.hooks.delete(name);
                    }
                }
            }
        };
    }

    /**
     * Register a hook that can only be triggered once
     * @param name Hook name
     * @param callback Callback function
     * @returns Token to cancel the hook
     */
    onceHook(name: string, callback: HookCallback): HookToken {
        if (!this.onceHooks.has(name)) {
            this.onceHooks.set(name, new Set());
        }
        this.onceHooks.get(name)!.add(callback);

        return {
            cancel: () => {
                const callbacks = this.onceHooks.get(name);
                if (callbacks) {
                    callbacks.delete(callback);
                    if (callbacks.size === 0) {
                        this.onceHooks.delete(name);
                    }
                }
            }
        };
    }

    /**
     * Trigger all hooks with the given name
     * @param name Hook name
     * @param args Arguments to pass to the callbacks
     */
    trigger(name: string): void {
        // Trigger regular hooks
        const callbacks = this.hooks.get(name);
        if (callbacks) {
            callbacks.forEach(callback => callback());
        }

        // Trigger and remove once hooks
        const onceCallbacks = this.onceHooks.get(name);
        if (onceCallbacks) {
            onceCallbacks.forEach(callback => callback());
            this.onceHooks.delete(name);
        }
    }

    async triggerAsync(name: string): Promise<void> {
        const callbacks = this.hooks.get(name);
        if (callbacks) {
            return void Promise.all(Array.from(callbacks).map(callback => callback()));
        }

        const onceCallbacks = this.onceHooks.get(name);
        if (onceCallbacks) {
            return void Promise.all(Array.from(onceCallbacks).map(callback => callback()));
        }

        return Promise.resolve();
    }

    /**
     * Check if a hook exists
     * @param name Hook name
     * @returns Whether the hook exists
     */
    hasHook(name: string): boolean {
        return this.hooks.has(name) || this.onceHooks.has(name);
    }

    /**
     * Clear all hooks with the given name
     * @param name Hook name
     */
    clearHooks(name: string): void {
        this.hooks.delete(name);
        this.onceHooks.delete(name);
    }

    /**
     * Clear all hooks
     */
    clearAllHooks(): void {
        this.hooks.clear();
        this.onceHooks.clear();
    }

    /**
     * unhook a hook
     * @param name Hook name
     * @param callback Callback function
     */
    unhook(name: string, callback: HookCallback): void {
        this.hooks.get(name)?.delete(callback);
        this.onceHooks.get(name)?.delete(callback);
    }
}

/**
 * A flexible hook system that manages multiple named hook chains in a single instance.
 * Each hook can mutate the flowing data or interrupt execution via ctx.reject.
 *
 * Hook function signature:
 *   (data, ctx) => newData | void | Promise<newData | void>
 *
 * - `data`        Current flowing data
 * - `ctx.reject`  Enter a message string to interrupt the subsequent hook execution and throw it to the caller
 *
 * Usage:
 *   const chain = new HookChain();
 *   const token = chain.tap("beforeSave", (data, ctx) => {
 *     if (data.invalid) ctx.reject("invalid");
 *   });
 *   const { result, rejected, message } = await chain.run("beforeSave", initial);
 *   chain.off(token); // remove when needed
 */

export interface HookContext {
    /** Interrupt remaining hooks with a message. */
    reject: (msg: string) => void;
}

export type HookFn<T = unknown> = (data: T, ctx: HookContext) => T | void | Promise<T | void>;

export class HookChain<T extends Record<string, any>> {
    private readonly events: Map<string, Set<HookFn<any>>> = new Map();

    /** Add a hook to specific event. Returns AppEventToken for cancellation. */
    tap<K extends StringKeyof<T>>(event: K, fn: HookFn<T[K]>): AppEventToken {
        let bucket = this.events.get(event);
        if (!bucket) {
            bucket = new Set();
            this.events.set(event, bucket);
        }
        bucket.add(fn as HookFn<any>);
        return {
            cancel: () => this.off(event, fn),
        };
    }

    /** Remove hook via the original function reference. */
    off<K extends StringKeyof<T>>(event: K, fn: HookFn<T[K]>): boolean {
        const bucket = this.events.get(event);
        if (bucket) {
            return bucket.delete(fn);
        }
        return false;
    }

    /** Remove all hooks for an event or all events */
    clear<K extends StringKeyof<T>>(event?: K): void {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    /**
     * Run hooks of an event.
     * Returns { result, rejected, message }
     */
    async run<K extends StringKeyof<T>>(event: K, initialData: T[K]): Promise<{ result?: T[K]; rejected: boolean; message?: string }> {
        const bucket = this.events.get(event);
        if (!bucket || bucket.size === 0) {
            return { result: initialData, rejected: false };
        }

        let data: T[K] = initialData;
        let rejected = false;
        let message: string | undefined;

        const ctx: HookContext = {
            reject: (msg: string) => {
                rejected = true;
                message = msg;
            },
        };

        for (const fn of bucket.values()) {
            if (rejected) break;
            const ret = await fn(data, ctx);
            if (rejected) break;
            if (ret !== undefined) {
                data = ret as T[K];
            }
        }

        return rejected ? { rejected, message } : { result: data, rejected: false };
    }
}


