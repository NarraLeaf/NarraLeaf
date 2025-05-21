import {z} from "zod";
import {ProjectFileType, DirStructureDefinition} from "@core/project/projectConfig/parser";
import {PlatformBuildTarget} from "@core/build/electron/target";

export type BaseProjectConfigZod = z.ZodObject<{
    build: z.ZodObject<{
        appId: z.ZodString;
        copyright: z.ZodString;
        dev: z.ZodBoolean;
        dist: z.ZodString;
        productName: z.ZodString;
        targets: z.ZodType<PlatformBuildTarget> | z.ZodArray<z.ZodType<PlatformBuildTarget>>;
    }>;
    main: z.ZodString;
    renderer: z.ZodObject<{
        baseDir: z.ZodString;
        allowHTTP: z.ZodBoolean;
    }>;
    temp: z.ZodString;
    dev: z.ZodObject<{
        port: z.ZodNumber;
    }>;
    resources: z.ZodString;
}>;
export type BaseProjectConfig = z.infer<BaseProjectConfigZod>;

export const BaseProjectStructure: DirStructureDefinition<{
    "package": z.ZodObject<{
        name: z.ZodString;
        version: z.ZodString;
        description: z.ZodString;
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
                name: z.string().nonempty("Name is required when publishing your App"),
                version: z.string().nonempty("Version is required when publishing your App"),
                description: z.string().nonempty("Description is required when publishing your App"),
            })
        },
        "narraleaf.config": {
            path: "narraleaf.config.js",
            type: ProjectFileType.CJS,
            validator: z.object({
                default: z.object({
                    build: z.object({
                        appId: z.string(),
                        copyright: z.string(),
                        dev: z.boolean(),
                        dist: z.string(),
                        productName: z.string(),
                        targets: z.custom<PlatformBuildTarget | PlatformBuildTarget[]>((value) => {
                            return Array.isArray(value)
                                ? value.every((t) => PlatformBuildTarget.isTarget(t))
                                : PlatformBuildTarget.isTarget(value);
                        }, "Invalid target configuration"),
                    }).partial(),
                    main: z.string(),
                    renderer: z.object({
                        baseDir: z.string(),
                        allowHTTP: z.boolean(),
                    }).partial(),
                    temp: z.string(),
                    dev: z.object({
                        port: z.number(),
                    }).partial(),
                    resources: z.string(),
                }).partial(),
            }),
        }
    }
};
