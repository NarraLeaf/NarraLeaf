import {RendererProject} from "@core/project/renderer/rendererProject";
import {Project} from "@core/project/project";
import {Fs} from "@/utils/fs";
import {createStructure} from "@core/build/renderer/prepare";
import {BuildTempStructure} from "@core/build/renderer/tempSrc";

export async function buildRenderer(
    {rendererProject}: {
        rendererProject: RendererProject;
    }
): Promise<string> {
    const buildDir = rendererProject.project.getTempDir(Project.TempNamespace.RendererBuild);

    await Fs.createDir(buildDir);
    await createStructure(BuildTempStructure, rendererProject, buildDir);

    return "";
}

