export class SidecarRuntimeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SidecarError";
    }
}

export class SidecarServiceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SidecarError";
    }
}
