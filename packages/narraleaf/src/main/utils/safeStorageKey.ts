import path from "path";

/** Maximum length for a storage key used as a single path segment (save id, json store file name). */
export const MAX_STORAGE_KEY_LENGTH = 200;

/**
 * Validates a key that must become a single path segment (no directories, no traversal).
 * Allowed characters: letters, digits, underscore, hyphen, dot (for names like "app.settings").
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
 * Resolves baseDir/fileNameExt and ensures the result stays inside baseDir (after normalization).
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
