export class SidecarRuntimeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SidecarRuntimeError";
    }
}

export class SidecarServiceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SidecarServiceError";
    }
}

export class SidecarInternalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SidecarInternalError";
    }
}
