import path from "path";

export type FileTree = {
    type: "file";
    name: string;
    srcName?: string;
} | {
    type: "dir";
    name: string;
    children: FileTree[];
};

export function normalizePath(p: string): string {
    return path.normalize(p).replace(/\\/g, "/");
}
