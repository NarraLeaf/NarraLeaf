import { RequestStatus } from "@/shared/types/ipcEvents";
import { useCallback, useEffect, useState, useRef } from "react";
import { useApp } from "../lib/providers/AppProvider";
import { RendererProcessError } from "@/shared/utils/error";

export type SharedStateHookResult<T extends Record<string, any>> = [SharedStateStatus<T>, SharedStateSetter<T>];

/**
 * Configuration object for `useSharedState`.
 *
 * All fields are optional.
 */
export interface SharedStateHookOptions {
    /**
     * Freeze live updates pushed from the main-process.
     * When `true`, the hook will ignore broadcasted state changes; callers can still obtain the
     * freshest value manually via `refetch`.
     *
     * @default false
     */
    frozen: boolean;

    /**
     * Enable optimistic UI.
     * When `true`, `setState` updates the local `data` immediately and rolls back only if the IPC
     * round-trip fails.
     *
     * @default false
     */
    optimistic: boolean;
}

/**
 * Reactive status returned by `useSharedState`.
 */
export interface SharedStateStatus<T extends Record<string, any>> {
    /** Latest state object or `null` before the initial fetch. */
    data: T | null;
    /** `true` while a fetch or mutation is in flight. */
    loading: boolean;
    /** Business error message returned by the main-process, `null` means no error. */
    error: string | null;

    /**
     * Manually reload the value from the main-process.
     * @throws RendererProcessError - if the underlying IPC call returns `success: false`.
     */
    refetch: () => Promise<void>;
}

/**
 * Setter function returned by `useSharedState`.
 *
 * Accepts either a plain object or a functional updater.
 */
export type SharedStateSetter<T extends Record<string, any>> = (
    next: T | ((prev: T) => T | Promise<T>)
) => Promise<void>;

export function useSharedState<T extends Record<string, any>>(key: string, arg1: Partial<SharedStateHookOptions> = {}): SharedStateHookResult<T> {
    const options = {
        frozen: false,
        optimistic: false,
        ...arg1,
    };

    const app = useApp();
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(true);

    // Promise queue – serialises refetch/mutation calls to prevent race conditions.
    const queue = useRef<Promise<unknown>>(Promise.resolve());
    const enqueue = useCallback(<R,>(task: () => Promise<R>): Promise<R> => {
        const next = queue.current.then(task, task);
        queue.current = next.catch(() => {}); // keep chain alive
        return next;
    }, []);

    // Flip-flop when component unmounts so async handlers can bail early.
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const setStates = ({ loading, error, data }: { loading: boolean, error: string | null | undefined, data: T | null }) => {
        if (!isMounted.current) return;
        setLoading(loading);
        setError(error ?? null);
        setData(data);
    }

    const refetchData = useCallback<(() => Promise<RequestStatus<Record<string, any> | null>>)>(async () => {
        return enqueue(async () => {
            setStates({ loading: true, error: null, data: null });

            const res = await app.getState(key);
            if (!res.success) {
                setStates({ loading: false, error: res.error, data: null });
                return res;
            }

            setStates({ loading: false, error: null, data: res.data as T });
            return res;
        });
    }, [enqueue, app, key]);

    const setState = useCallback<SharedStateSetter<T>>(async (arg) => {
        return enqueue(async () => {
            const current: T | null = data ?? ((await refetchData()).data ?? null) as T | null;
            if (!current) throw new RendererProcessError("no prev data");

            const resolved = typeof arg === "function" ? await arg(current) : arg;

            if (options.optimistic) {
                setStates({ loading: false, error: null, data: resolved });
            } else if (isMounted.current) {
                setLoading(true);
            }

            const res = await app.setState(key, resolved);
            if (!res.success) {
                setStates({ loading: false, error: res.error, data: current });
            } else {
                setStates({ loading: false, error: null, data: resolved });
            }
        });
    }, [enqueue, app, key, data, options.optimistic, refetchData]);

    // Initialize the state
    useEffect(() => {
        refetchData();
    }, [key]);

    // Listen for state changes
    useEffect(() => {
        if (options.frozen) {
            return;
        }

        return app.onStateChange(key, (data) => {
            if (!isMounted.current) return;
            setData(() => data as T);
        }).cancel;
    }, [key, options.frozen]);

    const refetch = async () => {
        const res = await refetchData();
        if (!res.success) {
            throw new Error(res.error);
        }
    };

    return [
        { data, loading, error, refetch },
        setState,
    ];
}