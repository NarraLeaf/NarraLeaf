#!/usr/bin/env node
import path from "path";
import Meta from "./meta";
import {App} from "./cli/app";
import {ActionRegistry} from "./cli/actions";
import {fileURLToPath} from 'url';

const cliRoot = path.resolve(__dirname || fileURLToPath(import.meta.url), "../");
const app = new App({
    name: Meta.name,
    version: Meta.version,
    actions: ActionRegistry,
    cliRoot,
    cliDist: path.resolve(cliRoot, Meta.cliDist),
});

!async function () {
    return app.run(process);
}();
