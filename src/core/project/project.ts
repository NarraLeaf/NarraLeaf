import {BaseProjectConfig, BaseProjectStructure} from "@core/project/projectConfig/baseProject";
import {InferProjectStructure} from "@core/project/projectConfig/parser";
import {DefaultProjectConfig, mergeConfig} from "@core/project/projectConfig/defaults";
import {ProjectFs} from "@/utils/fs";


export class Project {
    public structure: InferProjectStructure<typeof BaseProjectStructure>;
    public config: BaseProjectConfig;
    public readonly root: string;
    public readonly fs: ProjectFs;
    public name: string = "";
    public version: string = "";
    public description: string = "";

    constructor(root: string, structure: InferProjectStructure<typeof BaseProjectStructure>) {
        this.structure = structure;

        this.root = root;
        this.fs = new ProjectFs(this.root);
        this.config = this.mergeConfig();
        this.readPackage();
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
