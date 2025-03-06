import {Logger} from "@/cli/logger";
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

export function getFileTree(header: string, fileTree: FileTree[], failedEntities: string[]): string {
    const lines: string[] = [];

    const printTree = (tree: FileTree[], prefix: string = "") => {
        tree.forEach((file, index) => {
            const failed = failedEntities.includes(file.name);
            const isLast = index === tree.length - 1;
            const connector = isLast ? "└── " : "├── ";
            lines.push(`${prefix}${connector}${failed ? Logger.chalk.bgRed(file.name) : file.name}`);

            if (file.type === "dir") {
                const newPrefix = prefix + (isLast ? "    " : "│   ");
                printTree(file.children, newPrefix);
            }
        });
    };

    printTree(fileTree, "");
    return `${header}\n${lines.join("\n")}`;
}

export function normalizePath(p: string): string {
    return path.normalize(p).replace(/\\/g, "/");
}
