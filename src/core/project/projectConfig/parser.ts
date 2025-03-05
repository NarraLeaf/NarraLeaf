import {z} from "zod";
import {ValuesOf} from "@/utils/types";
import {jsonc as jsoncLib} from "jsonc";
import {failed, importCJS, success, zodErrorToString} from "@/utils/userInput";
import {Logger} from "@/cli/logger";
import {FsResult, ProjectFs} from "@/utils/nodejs/fs";
import {errorToString} from "@/utils/pure/string";

const safe = jsoncLib.safe;

export enum ProjectFileType {
    JSONC = "jsons",
    CJS = "cjs",
    DIR = "dir",
    FILE = "file",
}

export type DirStructureDefinition<Contains extends {
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

export type InferDirStructure<T extends DirStructureDefinition<any>> =
    T extends DirStructureDefinition<infer Contains> ? {
        [K in keyof Contains]: Contains[K] extends string ? string : z.infer<Contains[K]>;
    } : never;

export async function parseDirStructure<T extends DirStructureDefinition<any>>(
    definition: T,
    root: string,
): Promise<InferDirStructure<T>> {
    const projectFs = new ProjectFs(root);
    const result = {} as InferDirStructure<T>;

    for (const key in definition.contains) {
        const fileDef = definition.contains[key];
        const fileResult = await handleFile(fileDef, projectFs);
        if (!fileResult.ok) {
            throw new Error(`Failed to parse project structure: ${fileResult.error}`);
        }
        result[key as keyof InferDirStructure<T>] = fileResult.data;
    }

    return result;
}

async function handleFile<T extends ValuesOf<DirStructureDefinition<any>["contains"]>>(
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
    } else if (fileDef.type === ProjectFileType.DIR) {
        const result = await projectFs.tryAccessDir(fileDef.path);
        if (!result.ok) {
            return result;
        }

        return success(fileDef.validator ? fileDef.validator.parse(result.data) : result.data);
    } else if (fileDef.type === ProjectFileType.FILE) {
        const result = await projectFs.tryAccessFile(fileDef.path);
        if (!result.ok) {
            return result;
        }

        return success(fileDef.validator ? fileDef.validator.parse(result.data) : result.data);
    }

    throw new Error("Unknown file type: " + fileDef.type);
}
