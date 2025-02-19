
export type ValuesOf<T> = T[keyof T];
export type Result<T, OK extends true | false = true | false> = OK extends true ? { ok: true; data: T } : {
    ok: false;
    error: string
};
