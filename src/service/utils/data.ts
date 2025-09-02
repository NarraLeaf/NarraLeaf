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

export function isFunction(value: unknown): value is (...args: any[]) => any {
    return typeof value === "function";
}

export interface TaskInfo {
    promise: Promise<unknown>;
    cancelCallback?: () => void;
}

export class Tasks {
    private tasks: TaskInfo[] = [];

    /**
     * Add a task with optional cancel callback
     * @param promise The promise to track
     * @param cancelCallback Optional function to call when task is cancelled
     */
    push<T>(promise: Promise<T>, cancelCallback?: () => void): Promise<T> {
        const task = { promise, cancelCallback };
        this.tasks.push(task);
        
        // Auto cleanup when task completes
        promise
            .finally(() => {
                this.removeTask(task);
            });

        return promise;
    }

    /**
     * Remove a task from the list
     * @param task Task to remove
     */
    private removeTask(task: TaskInfo): void {
        const index = this.tasks.indexOf(task);
        if (index > -1) {
            this.tasks.splice(index, 1);
        }
    }

    /**
     * Cancel a specific task by index
     * @param index Task index
     * @returns Whether the task was found and cancelled
     */
    cancel(index: number): boolean {
        if (index < 0 || index >= this.tasks.length) {
            return false;
        }

        const task = this.tasks[index];
        
        // Call cancel callback if provided
        if (task.cancelCallback) {
            task.cancelCallback();
        }

        this.tasks.splice(index, 1);
        return true;
    }

    /**
     * Cancel all tasks
     * @returns Number of tasks cancelled
     */
    cancelAll(): number {
        const count = this.tasks.length;
        
        this.tasks.forEach(task => {
            if (task.cancelCallback) {
                task.cancelCallback();
            }
        });

        this.tasks = [];
        return count;
    }

    /**
     * Get the number of active tasks
     * @returns Number of active tasks
     */
    size(): number {
        return this.tasks.length;
    }
}
