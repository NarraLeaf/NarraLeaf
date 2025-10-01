
export function countDirectoryLevels(path: string): number {
    path = path.replace(/^\.\/|\/$/g, "");
    return path.split("/").length;
}

export function reverseDirectoryLevels(path: string): string {
    return "../".repeat(countDirectoryLevels(path));
}

export function generateId(length: number = 16): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
