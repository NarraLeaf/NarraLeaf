import {z} from "zod";
import {ProjectFileType, ProjectStructureDefinition} from "@core/project/projectConfig/parser";

export type BaseProjectConfigZod = z.ZodObject<{
    renderer: z.ZodObject<{
        baseDir: z.ZodString | z.ZodUndefined;
    }>;
    story: z.ZodObject<{
        entry: z.ZodString | z.ZodUndefined;
    }>;
    main: z.ZodString | z.ZodUndefined;
}>;
export type BaseProjectConfig = z.infer<BaseProjectConfigZod>;

export const BaseProjectStructure: ProjectStructureDefinition<{
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
                main: z.string().nonempty("Main file is required for your app"),
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
                    story: z.object({
                        entry: z.string(),
                    }).partial(),
                    main: z.string(),
                }).partial(),
            }),
        }
    }
};
