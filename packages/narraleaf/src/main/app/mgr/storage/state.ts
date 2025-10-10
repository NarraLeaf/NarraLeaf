import { HookChain, HookFn } from "@/main/utils/data";
import { JsonStore } from "@/main/utils/jsonStore";
import { AppEventToken } from "../../types";
import { StringKeyof } from "@/shared/utils/types";

interface StateConfig<T extends Record<string, any>> {
    jsonStore: JsonStore<T>;
}

type StateEvents<T extends Record<string, any>> = {
    "change": T;
};

export class State<T extends Record<string, any>> {
    private config: StateConfig<T>;
    private hookChain: HookChain<StateEvents<T>>;

    constructor(config: StateConfig<T>) {
        this.config = config;
        this.hookChain = new HookChain<StateEvents<T>>();
    }

    /**
     * Register a callback to be executed when the specified state event is emitted.
     *
     * @param event - Name of the event to listen for (currently only "change").
     * @param fn    - Callback executed when the event occurs.
     * @returns A token that can later be used to unsubscribe via `offState`.
     */
    public onState<K extends StringKeyof<StateEvents<T>>>(event: K, fn: HookFn<StateEvents<T>[K]>): AppEventToken {
        return this.hookChain.tap(event, fn);
    }

    /**
     * Remove a previously registered callback for a given state event.
     *
     * @param event - Event the callback was initially registered for.
     * @param fn    - Same callback instance passed to `onState`.
     */
    public offState<K extends StringKeyof<StateEvents<T>>>(event: K, fn: HookFn<StateEvents<T>[K]>): void {
        this.hookChain.off(event, fn);
    }

    /**
     * Remove all callbacks associated with the specified state event.
     *
     * @param event - Event whose callback list should be cleared.
     */
    public clearState<K extends StringKeyof<StateEvents<T>>>(event: K): void {
        this.hookChain.clear(event);
    }

    /**
     * Convenience wrapper for `onState("change", fn)`.
     *
     * Registers a callback that will be invoked every time the underlying
     * JSON store data changes.
     *
     * The callback receives two parameters:
     * 1. `data` – the new state object flowing through the hook chain.
     * 2. `ctx`  – helper object. Call `ctx.reject(message)` to abort the chain
     *            and cancel the pending `write()` operation.
     *
     * @example Normal subscription
     * ```ts
     * const token = state.watch((data) => {
     *   console.log("state changed", data);
     * });
     * // ...later
     * token.cancel(); // unsubscribe when no longer needed
     * ```
     *
     * @example Interrupt write when validation fails
     * ```ts
     * state.watch((data, ctx) => {
     *   if (!data.username) {
     *     ctx.reject("username is required");
     *   }
     * });
     *
     * try {
     *   await state.write({ username: "" });
     * } catch (err) {
     *   console.error(err); // -> Error: username is required
     * }
     * ```
     *
     * @param fn - Callback executed on every state change.
     * @returns A token that can later be used to unsubscribe.
     */
    public watch(fn: HookFn<StateEvents<T>["change"]>): AppEventToken {
        return this.hookChain.tap("change", fn);
    }

    /**
     * Read the entire persisted state from the underlying JSON store.
     *
     * @returns Promise resolving with the current state object.
     */
    public async read(): Promise<T> {
        return await this.config.jsonStore.read();
    }

    /**
     * Persist the provided state to the underlying JSON store.
     *
     * Before the write occurs, all "change" hooks are executed. If any hook
     * rejects, the write is aborted and an error is thrown.
     *
     * @param data - New state to be written.
     * @throws Error if any "change" hook rejects.
     */
    public async write(data: T): Promise<void> {
        const { rejected, message } = await this.hookChain.run("change", data);
        if (rejected) {
            throw new Error(message);
        }

        await this.config.jsonStore.write(data);
    }
}
