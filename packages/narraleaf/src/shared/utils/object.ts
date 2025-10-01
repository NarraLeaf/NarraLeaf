

export function safeClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}
