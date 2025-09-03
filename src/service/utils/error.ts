export class ServiceRuntimeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SidecarRuntimeError";
    }
}

export class ServiceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SidecarServiceError";
    }
}

export class ServiceInternalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SidecarInternalError";
    }
}
