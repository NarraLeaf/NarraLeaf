
export class CriticalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CriticalError";
    }
}

export class CriticalMainProcessError extends CriticalError {
    constructor(message: string) {
        super(message);
        this.name = "CriticalMainProcessError";
    }
}

export class CriticalRendererProcessError extends CriticalError {
    constructor(message: string) {
        super(message);
        this.name = "CriticalRendererProcessError";
    }
}

export function errorToString(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

