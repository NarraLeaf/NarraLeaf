import {BaseProjectConfig, BaseProjectStructure} from "@core/project/projectConfig/baseProject";
import {InferDirStructure, parseDirStructure} from "@core/project/projectConfig/parser";
import {DefaultProjectConfig, mergeConfig} from "@core/project/projectConfig/defaults";
import {RendererProject} from "@core/project/renderer/rendererProject";
import {AppProjectRendererStructure} from "@core/project/projectConfig/appProject";
import path from "path";
import {buildRenderer, RendererBuildResult, RendererBuildWatchToken, watchRenderer} from "@core/build/renderer/build";
import {buildMain, MainBuildResult, MainBuildWatchToken, watchMain} from "@core/build/main/build";
import {AppBuildResult, buildApp} from "@core/build/electron/pack";
import {ProjectFs} from "@/utils/nodejs/fs";
import {DevTempNamespace, TempNamespace} from "@core/constants/tempNamespace";
import {App} from "@/cli/app";
import {ElectronDevServerToken, watchElectronApp} from "@core/dev/electron";



export class Project {
    public static readonly TempNamespace = TempNamespace;
    public static readonly DevTempNamespace = DevTempNamespace;

    public structure: InferDirStructure<typeof BaseProjectStructure>;
    public config: BaseProjectConfig;
    public readonly root: string;
    public readonly fs: ProjectFs;
    public readonly app: App;
    public name: string = "";
    public version: string = "";
    public description: string = "";

    constructor(app: App, root: string, structure: InferDirStructure<typeof BaseProjectStructure>) {
        this.structure = structure;

        this.root = root;
        this.fs = new ProjectFs(this.root);
        this.app = app;
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

    public getDevTempDir(namespace?: DevTempNamespace): string {
        return namespace
            ? path.resolve(this.fs.resolve(this.config.temp), namespace)
            : this.fs.resolve(this.config.temp);
    }

    public getRootDir(): string {
        return this.root;
    }

    public buildRenderer(rendererProject: RendererProject): Promise<RendererBuildResult> {
        return buildRenderer({rendererProject});
    }

    public watchRenderer(rendererProject: RendererProject, onRebuild?: VoidFunction): Promise<RendererBuildWatchToken> {
        return watchRenderer({rendererProject, onRebuild});
    }

    public buildMain(): Promise<MainBuildResult> {
        return buildMain({
            userEntry: this.fs.resolve(this.config.main),
            project: this
        });
    }

    public watchMain(onRebuild?: VoidFunction): Promise<MainBuildWatchToken> {
        return watchMain({
            userEntry: this.fs.resolve(this.config.main),
            project: this, onRebuild
        });
    }

    public electron(): Promise<ElectronDevServerToken> {
        return watchElectronApp(this);
    }

    public buildApp(rendererProject: RendererProject): Promise<AppBuildResult> {
        return buildApp(rendererProject);
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
