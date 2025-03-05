import path from "path";

export function safeImportPath(p: string): string {
    return path.normalize(removeExtension(p)).replace(/\\/g, "/");
}

export function removeExtension(p: string): string {
    const parsed = path.parse(p);
    return path.join(parsed.dir, parsed.name);
}

