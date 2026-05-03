import { requestMain } from "./requestMain";

/**
 * One entry in {@link MainProcessEventMap}: payload sent to the main process and response data.
 * Use `payload: void` for no payload; use `response: void` when nothing is returned.
 */
export interface MainProcessEventEntry<P = unknown, R = unknown> {
    payload: P;
    response: R;
}

/**
 * Registry of custom main-process RPC event names (the `event` string) to payload/response types.
 * Extend via TypeScript declaration merging in your project or plugin package.
 *
 * @example
 * declare module "narraleaf/renderer" {
 *   interface MainProcessEventMap {
 *     "my-plugin:ping": MainProcessEventEntry<{ id: string }, { ok: boolean }>;
 *   }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MainProcessEventMap {}

/**
 * Type-safe wrapper around {@link requestMain} for events declared on {@link MainProcessEventMap}.
 * Until you augment the map, no keys are valid — use {@link requestMain} for ad-hoc RPC instead.
 */
export async function invokeMainEvent<E extends keyof MainProcessEventMap>(
    event: E,
    payload: MainProcessEventMap[E] extends MainProcessEventEntry<infer P, infer _R> ? P : never,
): Promise<
    MainProcessEventMap[E] extends MainProcessEventEntry<infer _P, infer R> ? R : never
> {
    return requestMain(event as string, payload as never);
}
