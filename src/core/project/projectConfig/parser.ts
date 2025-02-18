import {z} from "zod";
import {ProjectConfigZod} from "@core/project/projectConfig/config";

enum ProjectFileType {
    JSON = "json",
    CJS = "cjs",
}

type ProjectStructureDefinition<Contains extends {
    [K in string]: string | z.infer<z.ZodType<any, any, any>>
}> = {
    contains: {
        [K in keyof Contains]: {
            path: string;
            type: ProjectFileType;
            validator: Contains[K] extends string ? null : z.ZodType<any, any, any>;
        }
    };
};

export type InferProjectStructure<T extends ProjectStructureDefinition<any>> =
    T extends ProjectStructureDefinition<infer Contains> ? Contains : never;

const ProjectStructure: ProjectStructureDefinition<{
    "package.json": z.ZodObject<{
        name: z.ZodString;
        version: z.ZodString;
        description: z.ZodString;
        main: z.ZodString;
    }>;
    "narraleaf.config.js": ProjectConfigZod;
}> = {
    contains: {
        "package.json": {
            path: "package.json",
            type: ProjectFileType.JSON,
            validator: z.object({
                name: z.string().nonempty("Name is required when publishing your app"),
                version: z.string().nonempty("Version is required when publishing your app"),
                description: z.string().nonempty("Description is required when publishing your app"),
                main: z.string().nonempty("Main file is required for your app"),
            })
        },
        "narraleaf.config.js": {
            path: "narraleaf.config.js",
            type: ProjectFileType.CJS,
            validator: z.object({
                renderer: z.object({
                    appFile: z.string().optional(),
                    pagesDir: z.string().optional(),
                })
            }),
        }
    }
};

