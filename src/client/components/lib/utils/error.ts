export class CriticalRendererProcessError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CriticalRendererProcessError";
    }
}