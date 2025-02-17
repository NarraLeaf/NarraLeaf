#!/usr/bin/env node
import {App} from "./cli/app";
import Meta from "./meta";
import {ActionRegistry} from "./cli/actions";

const app = new App({
    name: Meta.name,
    version: Meta.version,
    actions: ActionRegistry,
});

!async function (){
    return app.run(process);
}();
