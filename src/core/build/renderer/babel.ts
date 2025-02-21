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
            },
        };
    }

    public getPresets() {
        return [
            "@babel/preset-env",
            "@babel/preset-typescript",
            ...(this.useReact ? ["@babel/preset-react"] : []),
        ];
    }
}
