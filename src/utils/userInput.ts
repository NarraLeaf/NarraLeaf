import {Result} from "@/utils/types";
import {pathToFileURL} from "node:url";
import {z} from "zod";
import {Logger} from "@/cli/logger";
import {errorToString} from "@/utils/pure/string";

export async function importCJS(module: string | string[]): Promise<Result<unknown>> {
    const tryImport = async (module: string) => {
        try {
            return success(await import(toFileProtocol(module)));
        } catch (error) {
            return failed(errorToString(error));
        }
    };

    const errors: string[] = [];
    if (Array.isArray(module)) {
        for (const m of module) {
            const result = await tryImport(m);
            if (result.ok) {
                return result;
            }
            errors.push(result.error);
        }
        return failed("Failed to import module: " + errors.join("\n"));
    } else {
        return tryImport(module);
    }
}

export function failed<T>(error: string): Result<T, false> {
    return {
        ok: false,
        error
    };
}

export function success<T>(data: T): Result<T, true> {
    return {
        ok: true,
        data
    };
}

export function isFailed<T>(result: any): result is Result<T, false> {
    return typeof result === "object"
        && result !== null
        && result.ok === false
        && typeof result.error === "string";
}

export function toFileProtocol(p: string): string {
    return pathToFileURL(p).toString();
}

export function zodErrorToString(error: any): string {
    return (error as z.ZodError).errors.map(e => (
        `${Logger.chalk.red("path:")} ${Logger.chalk.blue(e.path.join("."))}${Logger.chalk.red(", message: ")}${Logger.chalk.blue(e.message)}`
    )).join("\n");
}

