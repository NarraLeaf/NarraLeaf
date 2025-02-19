import {Project} from "@core/project/project";
import {InferDirStructure} from "@core/project/projectConfig/parser";
import {AppProjectRendererStructure} from "@core/project/projectConfig/appProject";


export class RendererProject {
    public project: Project;
    public structure: InferDirStructure<typeof AppProjectRendererStructure>;

    constructor(project: Project, structure: InferDirStructure<typeof AppProjectRendererStructure>) {
        this.project = project;
        this.structure = structure;
    }
}

