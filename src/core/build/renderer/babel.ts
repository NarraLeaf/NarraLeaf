import {WebpackModule} from "@core/build/webpack";

export class Babel extends WebpackModule {
    public test: RegExp = /\.(js|jsx|ts|tsx)$/;
    public exclude: RegExp = /node_modules/;

    constructor(public useReact: boolean) {
        super();
    }

    public getLoader() {
        return {
            loader: "babel-loader",
            options: {
                presets: this.getPresets(),
                plugins: this.getPlugins(),
                cacheDirectory: true,
            },
        };
    }

    public getPresets() {
        return [
            ["@babel/preset-env", {
                targets: {
                    node: "current"
                }
            }],
            "@babel/preset-typescript",
            ...(this.useReact ? [["@babel/preset-react", {
                runtime: "automatic",
                development: process.env.NODE_ENV === "development"
            }]] : []),
        ];
    }

    public getPlugins() {
        return this.useReact ? [
            ["@babel/plugin-transform-react-jsx", {
                runtime: "automatic",
                importSource: "react"
            }]
        ] : [];
    }
}
