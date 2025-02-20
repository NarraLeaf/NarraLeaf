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
 * # CSS
 * - style-loader
 * - css-loader
 */
import {Configuration, RuleSetUse} from "webpack";

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
}

export class WebpackConfig {
    public config: BaseWebpackConfig;
    public modules: WebpackModule[];
    public plugins: any[];

    constructor(config: BaseWebpackConfig) {
        this.config = config;
        this.modules = [];
        this.plugins = [];
    }

    public getConfiguration(): Configuration {
        return {
            mode: this.config.mode,
            entry: this.config.entry,
            output: {
                filename: this.config.outputFilename,
                path: this.config.outputDir,
            },
            resolve: {
                extensions: this.config.extensions,
            },
            module: {
                rules: this.modules.map(module => ({
                    test: module.test,
                    exclude: module.exclude,
                    use: module.getLoader()
                }))
            },
            plugins: this.plugins,
            ...this.config.extend,
        };
    }

    useModule(module: WebpackModule): this {
        this.modules.push(module);
        return this;
    }

    usePlugin(plugin: any): this {
        this.plugins.push(plugin);
        return this;
    }
}

export abstract class WebpackModule {
    public abstract test: RegExp;
    public abstract exclude: RegExp;

    public abstract getLoader(): RuleSetUse;
}

