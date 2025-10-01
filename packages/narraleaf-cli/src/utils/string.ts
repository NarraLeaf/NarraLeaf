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

export function normalize(p: string): string {
    return p.replace(/\\/g, "/");
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

export const sep = {
    posix: "/",
    win32: "\\"
};

export function safeImportPath(p: string): string {
    return path.normalize(removeExtension(p)).replace(/\\/g, "/");
}

export function removeExtension(p: string): string {
    const parsed = path.parse(p);
    return path.join(parsed.dir, parsed.name);
}