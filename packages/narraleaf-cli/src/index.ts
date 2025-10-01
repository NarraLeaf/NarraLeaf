import path from "path";
import Meta from "./meta";
import {App} from "@/interface/app";
import {ActionRegistry} from "@/interface/actions";
import {fileURLToPath} from 'url';
import { readJsonSync } from "@/utils/json";

const cliRoot = path.resolve(__dirname || fileURLToPath(import.meta.url), "../");
const version = readJsonSync(path.resolve(cliRoot, "package.json")).version;
const app = new App({
    name: Meta.name,
    version,
    actions: ActionRegistry,
    cliRoot,
    cliDist: path.resolve(cliRoot, Meta.cliDist),
});

!async function () {
    return app.run(process);
}();
