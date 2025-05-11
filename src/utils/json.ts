import fs from "fs";

export function readJsonSync(path: string) {
    const content = fs.readFileSync(path, "utf-8");
    return JSON.parse(content);
}
