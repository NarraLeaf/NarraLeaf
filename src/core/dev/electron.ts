import {Project} from "@core/project/project";
import {DevTempNamespace} from "@core/constants/tempNamespace";
import path from "path";
import {MainOutputFileName} from "@core/build/constants";
import {summon, SummonedProcess} from "@/utils/nodejs/os";
import {AppEventToken} from "@/main/app/types";

export type ElectronDevServerToken = {
    close(): Promise<void>;
    restart(): Promise<void>;
    onClose(callback: () => void): void;
}

export async function watchElectronApp(project: Project): Promise<ElectronDevServerToken> {
    const projectRoot = project.getRootDir();
    const electronBin = path.resolve(projectRoot, "node_modules/.bin/electron");
    const mainBuild = project.getDevTempDir(DevTempNamespace.MainBuild)
    const mainFile = path.resolve(mainBuild, MainOutputFileName);
    const closeListeners: Array<() => void> = [];

    let proc: SummonedProcess | null = null, closeListenerToken: AppEventToken | null = null;
    const emitClose = () => {
        closeListeners.forEach((listener) => listener());
    }
    const createProc = () => {
        if (proc) {
            proc.kill();
            project.app.unregisterChildProcess(proc.childProcesses);
        }

        proc = summon([electronBin, mainFile], project.app.getProcess());
        project.app.registerChildProcess(proc.childProcesses);
        closeListenerToken = proc.onClose(() => {
            emitClose();
            proc = null;
        });
    }

    createProc();

    return {
        async close(): Promise<void> {
            if (proc) {
                proc.kill();
                project.app.unregisterChildProcess(proc.childProcesses);
                proc = null;
            }
        },
        async restart(): Promise<void> {
            closeListenerToken?.cancel();
            createProc();
        },
        onClose(callback: () => void): void {
            closeListeners.push(callback);
        }
    };
}
