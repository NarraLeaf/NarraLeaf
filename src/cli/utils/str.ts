export function sliceString(str: string, n: number): string[] {
    return Array.from({ length: Math.ceil(str.length / n) }, (_, i) => str.slice(i * n, (i + 1) * n));
}
