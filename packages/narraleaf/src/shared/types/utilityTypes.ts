/** String keys of T (excludes symbol keys). */
export type StringKeyOf<T> = Extract<keyof T, string>;
