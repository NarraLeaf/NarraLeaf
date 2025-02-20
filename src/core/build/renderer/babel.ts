import {WebpackModule} from "@core/build/webpack";

export class Babel extends WebpackModule {
    public test: RegExp = /\.(js|jsx|ts|tsx)$/;
    public exclude: RegExp = /node_modules/;

    public getLoader() {
        return {
            loader: "babel-loader",
            options: {
                presets: [
                    "@babel/preset-env",
                    "@babel/preset-typescript",
                    ["@babel/preset-react", {
                        runtime: "automatic"
                    }],
                ]
            }
        };
    }
}
