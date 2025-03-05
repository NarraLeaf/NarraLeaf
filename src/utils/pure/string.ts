import path from "path";

export function sliceString(str: string, n: number): string[] {
    return Array.from({length: Math.ceil(str.length / n)}, (_, i) => str.slice(i * n, (i + 1) * n));
}

export function errorToString(error: any): string {
    if (error instanceof Error) {
        return error.message;
    } else if (typeof error === "string") {
        return error;
    } else {
        return JSON.stringify(error);
    }
}

export function errorToStack(error: any): string {
    if (error instanceof Error) {
        return error.stack || "";
    } else if (typeof error === "string") {
        return error;
    } else {
        return JSON.stringify(error);
    }
}

export function rest(p: string): string {
    return p.endsWith(path.sep) ? p + `**${path.sep}*` : p + `${path.sep}**${path.sep}*`;
}

export function root(p: string, sep: string): string {
    return p.split(sep)[0];
}

export function timeStringify(ms: number): string {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    if (ms < 1000 * 60) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${(ms / 1000 / 60).toFixed(1)}m`;
}

export function countDirectoryLevels(path: string): number {
    path = path.replace(/^\.\/|\/$/g, "");
    return path.split("/").length;
}

export function reverseDirectoryLevels(path: string): string {
    return "../".repeat(countDirectoryLevels(path));
}
