import {z} from "zod";
import {FsResult, ProjectFs} from "@/utils/fs";
import {ValuesOf} from "@/utils/types";
import {jsonc as jsoncLib} from "jsonc";
import {errorToString} from "@/utils/str";
import {failed, importCJS, success, zodErrorToString} from "@/utils/userInput";
import {Logger} from "@/cli/logger";

const safe = jsoncLib.safe;

export enum ProjectFileType {
    JSONC = "jsons",
    CJS = "cjs",
}

export type ProjectStructureDefinition<Contains extends {
    [K in string]: string | z.infer<z.ZodType<any, any, any>>
}> = {
    contains: {
        [K in keyof Contains]: {
            path: string | string[];
            type: ProjectFileType;
            validator: Contains[K] extends string ? null : z.ZodType<any, any, any>;
        }
    };
};

export type InferProjectStructure<T extends ProjectStructureDefinition<any>> =
    T extends ProjectStructureDefinition<infer Contains> ? {
        [K in keyof Contains]: Contains[K] extends string ? string : z.infer<Contains[K]>;
    } : never;

export async function parseProjectStructure<T extends ProjectStructureDefinition<any>>(
    definition: T,
    root: string,
): Promise<InferProjectStructure<T>> {
    const projectFs = new ProjectFs(root);
    const result = {} as InferProjectStructure<T>;

    for (const key in definition.contains) {
        const fileDef = definition.contains[key];
        const fileResult = await handleFile(fileDef, projectFs);
        if (!fileResult.ok) {
            throw new Error(`Failed to parse project structure: ${fileResult.error}`);
        }
        result[key as keyof InferProjectStructure<T>] = fileResult.data;
    }

    return result;
}

async function handleFile<T extends ValuesOf<ProjectStructureDefinition<any>["contains"]>>(
    fileDef: T,
    projectFs: ProjectFs
): Promise<FsResult<
    T["validator"] extends null ? string : T["validator"] extends z.ZodType ? z.infer<T["validator"]> : never
>> {
    if (fileDef.type === ProjectFileType.JSONC) {
        const result = await projectFs.tryRead(fileDef.path);
        if (!result.ok) {
            return result;
        }

        const [error, data] = safe.parse(result.data);
        if (error) {
            return failed(`Failed to parse JSONC file (path: ${Logger.chalk.blue(fileDef.path)}): ` + errorToString(error));
        }

        try {
            return success(fileDef.validator ? fileDef.validator.parse(data) : data);
        } catch (error) {
            return failed(`JSON structure validation failed (path:${Logger.chalk.blue(fileDef.path)}):\n` + zodErrorToString(error));
        }
    } else if (fileDef.type === ProjectFileType.CJS) {
        const result = await importCJS(
            Array.isArray(fileDef.path) ? fileDef.path.map(p => projectFs.resolve(p)) : projectFs.resolve(fileDef.path)
        );
        if (!result.ok) {
            return result;
        }
        const data = result.data;
        if (typeof data !== "object" || data === null) {
            return failed("Invalid JavaScript file: module must export an object");
        }

        try {
            return success(fileDef.validator ? fileDef.validator.parse(data) : data);
        } catch (error) {
            return failed(`Configuration validation failed (path: ${Logger.chalk.blue(fileDef.path)}):\n` + zodErrorToString(error));
        }
    }

    throw new Error("Unknown file type: " + fileDef.type);
}
