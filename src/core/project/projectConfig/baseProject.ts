import {z} from "zod";
import {ProjectFileType, DirStructureDefinition} from "@core/project/projectConfig/parser";

export type BaseProjectConfigZod = z.ZodObject<{
    renderer: z.ZodObject<{
        baseDir: z.ZodString;
    }>;
    main: z.ZodString;
    temp: z.ZodString;
    dev: z.ZodBoolean;
}>;
export type BaseProjectUserConfig = z.infer<BaseProjectConfigZod>;

export type BaseProjectConfig = {
    renderer: {
        baseDir: string;
    };
    main: string;
    temp: string;
    dev: boolean;
};

export const BaseProjectStructure: DirStructureDefinition<{
    "package": z.ZodObject<{
        name: z.ZodString;
        version: z.ZodString;
        description: z.ZodString;
        main: z.ZodString;
    }>;
    "narraleaf.config": z.ZodObject<{
        default: BaseProjectConfigZod;
    }>;
}> = {
    contains: {
        "package": {
            path: "package.json",
            type: ProjectFileType.JSONC,
            validator: z.object({
                name: z.string().nonempty("Name is required when publishing your app"),
                version: z.string().nonempty("Version is required when publishing your app"),
                description: z.string().nonempty("Description is required when publishing your app"),
            })
        },
        "narraleaf.config": {
            path: "narraleaf.config.js",
            type: ProjectFileType.CJS,
            validator: z.object({
                default: z.object({
                    renderer: z.object({
                        baseDir: z.string(),
                    }).partial(),
                    main: z.string(),
                    temp: z.string(),
                    dev: z.boolean(),
                }).partial(),
            }),
        }
    }
};
