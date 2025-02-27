import path from "path";

export function safeImportPath(p: string): string {
    return path.normalize(p).replace(/\\/g, "/");
}

