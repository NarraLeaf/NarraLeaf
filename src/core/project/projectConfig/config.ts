import { z } from "zod";

export type ProjectConfigZod = z.ZodObject<{
    renderer: z.ZodObject<{
        appFile: z.ZodString | z.ZodUndefined;
        pagesDir: z.ZodString | z.ZodUndefined;
    }>;
}>;
export type ProjectConfig = z.infer<ProjectConfigZod>;
