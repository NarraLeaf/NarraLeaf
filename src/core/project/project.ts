import {BaseProjectConfig, BaseProjectStructure} from "@core/project/projectConfig/baseProject";
import {InferDirStructure, parseDirStructure} from "@core/project/projectConfig/parser";
import {DefaultProjectConfig, mergeConfig} from "@core/project/projectConfig/defaults";
import {ProjectFs} from "@/utils/fs";
import {RendererProject} from "@core/project/renderer/rendererProject";
import {AppProjectRendererStructure} from "@core/project/projectConfig/appProject";
import path from "path";
import {buildRenderer} from "@core/build/renderer/build";

export enum TempNamespace {
    RendererBuild = "renderer-build",
}

export class Project {
    public static readonly TempNamespace = TempNamespace;

    public structure: InferDirStructure<typeof BaseProjectStructure>;
    public config: BaseProjectConfig;
    public readonly root: string;
    public readonly fs: ProjectFs;
    public name: string = "";
    public version: string = "";
    public description: string = "";

    constructor(root: string, structure: InferDirStructure<typeof BaseProjectStructure>) {
        this.structure = structure;

        this.root = root;
        this.fs = new ProjectFs(this.root);
        this.config = this.mergeConfig();
        this.readPackage();
    }

    public async createRendererProject(): Promise<RendererProject> {
        const rendererRoot = this.fs.resolve(this.config.renderer.baseDir);
        const structure = await parseDirStructure(AppProjectRendererStructure, rendererRoot);

        return new RendererProject(this, structure, rendererRoot);
    }

    public getTempDir(namespace?: TempNamespace): string {
        return namespace
            ? path.resolve(this.fs.resolve(this.config.temp), namespace)
            : this.fs.resolve(this.config.temp);
    }

    public build(rendererProject: RendererProject): Promise<string> {
        return buildRenderer({rendererProject});
    }

    private readPackage(): this {
        const {name, version, description} = this.structure["package"];

        this.name = name;
        this.version = version;
        this.description = description;

        return this;
    }

    private mergeConfig(): BaseProjectConfig {
        const {default: config} = this.structure["narraleaf.config"];

        return mergeConfig(DefaultProjectConfig, config) as BaseProjectConfig;
    }
}
