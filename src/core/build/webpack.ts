/**
 * Required:
 * # Webpack
 * - webpack
 * - webpack-dev-server (optional)
 *
 * # React
 * - html-webpack-plugin
 *
 * # Babel
 * - babel-loader
 * - @babel/core
 * - @babel/preset-env
 * - @babel/preset-react
 * - @babel/preset-typescript
 *
 * # StyleSheet
 * - style-loader
 * - css-loader
 */
import {Configuration, RuleSetUse} from "webpack";
import _ from "lodash";
import { App } from "@/cli/app";

export enum WebpackMode {
    Development = "development",
    Production = "production"
}

export type BaseWebpackConfig = {
    mode: WebpackMode;
    entry: string;
    outputDir: string;
    outputFilename: string;
    extensions: string[];
    extend?: Configuration;
    useCache?: boolean;
}

export class WebpackConfig {
    public config: BaseWebpackConfig;
    public modules: WebpackModule[];
    public plugins: any[];
    public node_modules: string[];

    constructor(config: BaseWebpackConfig) {
        this.config = config;
        this.modules = [];
        this.plugins = [];
        this.node_modules = [];
    }

    public getConfiguration(app: App): Configuration {
        return _.merge({
            mode: this.config.mode,
            entry: this.config.entry,
            output: {
                filename: this.config.outputFilename,
                path: this.config.outputDir,
            },
            resolve: {
                extensions: this.config.extensions,
                modules: this.node_modules,
            },
            module: {
                rules: this.modules.map(module => ({
                    test: module.test,
                    exclude: module.exclude,
                    use: module.getLoader(app)
                }))
            },
            plugins: this.plugins,
            cache: {
                type: this.config.useCache ? "filesystem" : "memory"
            },
        }, this.config.extend);
    }

    useModule(module: WebpackModule): this {
        this.modules.push(module);
        return this;
    }

    usePlugin(plugin: any): this {
        this.plugins.push(plugin);
        return this;
    }

    useNodeModule(module: string): this {
        this.node_modules.push(module);
        return this;
    }
}

export abstract class WebpackModule {
    public abstract test: RegExp;
    public abstract exclude: RegExp;

    public abstract getLoader(app: App): RuleSetUse;
}

