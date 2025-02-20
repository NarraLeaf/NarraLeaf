import {WebpackModule} from "@core/build/renderer/webpack";

export class StyleSheet extends WebpackModule {
    public test: RegExp = /\.css$/;
    public exclude: RegExp = /node_modules/;

    public getLoader() {
        return ["style-loader", "css-loader"];
    }
}
