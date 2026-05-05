import path from "path";

/** Maximum length for an opaque storage key used as a single path segment (save id, JSON store name). */
export const MAX_STORAGE_KEY_LENGTH = 200;

/**
 * Ensures `key` is safe to use as a single filesystem segment (game save id, JSON store file name,
 * or any host-provided id that lands under user data).
 *
 * Rules: non-empty, length ≤ {@link MAX_STORAGE_KEY_LENGTH}, no path separators or `..`,
 * characters limited to `^[a-zA-Z0-9_.-]+$`.
 *
 * @param key - Proposed opaque id or file stem.
 * @param fieldLabel - Label for thrown errors (default: `"Storage key"`).
 * @throws {Error} When the key violates the rules above.
 *
 * @example
 * ```ts
 * import { assertSafeStorageKey } from "narraleaf";
 *
 * assertSafeStorageKey("slot_01", "Save id");
 * ```
 */
export function assertSafeStorageKey(key: string, fieldLabel: string = "Storage key"): void {
    if (typeof key !== "string" || key.length === 0) {
        throw new Error(`${fieldLabel} must be a non-empty string`);
    }
    if (key.length > MAX_STORAGE_KEY_LENGTH) {
        throw new Error(`${fieldLabel} exceeds maximum length (${MAX_STORAGE_KEY_LENGTH})`);
    }
    if (path.basename(key) !== key) {
        throw new Error(`${fieldLabel} must not contain path separators`);
    }
    if (key.includes("..")) {
        throw new Error(`${fieldLabel} must not contain '..'`);
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
        throw new Error(
            `${fieldLabel} must contain only letters, digits, underscore, hyphen, and dot`
        );
    }
}

/**
 * Resolves `baseDir/fileNameExt` and ensures the result stays inside `baseDir` after normalization.
 */
export function resolveContainedFilePath(
    baseDir: string,
    fileNameWithExtension: string,
    fieldLabel: string = "Path"
): string {
    if (path.basename(fileNameWithExtension) !== fileNameWithExtension) {
        throw new Error(`${fieldLabel} must be a single file name`);
    }
    const resolvedBase = path.resolve(baseDir);
    const candidate = path.resolve(resolvedBase, fileNameWithExtension);
    const relative = path.relative(resolvedBase, candidate);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error(`${fieldLabel} escapes storage directory`);
    }
    return candidate;
}
