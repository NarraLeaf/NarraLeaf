import {RendererProject} from "@core/project/renderer/rendererProject";
import path from "path";
import {Fs} from "@/utils/fs";

export enum StructureEntityType {
    File = "file",
    Dir = "dir",
}

export type BuildTempStructure = {
    type: StructureEntityType.Dir;
    name: string;
    children?: BuildTempStructure[];
} | {
    type: StructureEntityType.File;
    name: string;
    src: string | ((rendererProject: RendererProject) => string);
};

export async function createStructure(
    structure: BuildTempStructure[],
    rendererProject: RendererProject,
    dest: string,
): Promise<void> {
    if (!path.isAbsolute(dest)) {
        throw new Error("Destination path must be absolute");
    }

    for (const item of structure) {
        const p = path.resolve(dest, item.name);
        if (item.type === StructureEntityType.Dir) {
            await Fs.createDir(p);
            if (item.children) {
                await createStructure(item.children, rendererProject, path.resolve(dest, item.name));
            }
        } else {
            const src = typeof item.src === "function" ? item.src(rendererProject) : item.src;
            await Fs.write(p, src);
        }
    }
}
