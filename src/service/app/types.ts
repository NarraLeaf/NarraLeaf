export type ServiceEvents = {
    "ready": [];
};

export type ServiceEventToken = {
    cancel(): void;
};
export type ServiceEventCallback<T extends keyof ServiceEvents> = (
    ...args: ServiceEvents[T] extends unknown[] ? ServiceEvents[T] : never
) => void;