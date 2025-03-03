import {Project} from "@core/project/project";
import {InferDirStructure} from "@core/project/projectConfig/parser";
import {AppProjectRendererStructure} from "@core/project/projectConfig/appProject";

import {ProjectFs} from "@/utils/nodejs/fs";


export class RendererProject {
    public project: Project;
    public structure: InferDirStructure<typeof AppProjectRendererStructure>;
    public readonly root: string;
    public readonly fs: ProjectFs;

    constructor(project: Project, structure: InferDirStructure<typeof AppProjectRendererStructure>, root: string) {
        this.project = project;
        this.structure = structure;
        this.root = root;
        this.fs = new ProjectFs(this.root);
    }

    getAppEntry(): string {
        return this.fs.resolve(this.structure.app);
    }

    getPublicDir(): string {
        return this.fs.resolve(this.structure.public);
    }
}

