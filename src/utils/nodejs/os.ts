import {ChildProcess, spawn} from "child_process";
import { AppEventToken } from "@/main/app/types";
import mime from "mime-types";
import path from "path";

export type SummonedProcess = {
    kill(): void;
    onClose(callback: (code: number) => void): AppEventToken;
    childProcesses: ChildProcess;
};

export function summon(
    args: string[],
    process: NodeJS.Process
): SummonedProcess {
    const child = spawn(args[0], args.slice(1), {
        stdio: "inherit",
        shell: true,
        env: process.env,
        cwd: process.cwd(),
    });

    return {
        kill() {
            if (child.pid) {
                child.kill("SIGKILL");
            } else {
                throw new Error("Unable to kill child process (ID: " + child.pid + ")");
            }
        },
        onClose(callback: (code: number) => void) {
            const handler = (code: number | null) => {
                if (code) {
                    callback(code);
                }
            };
            child.on("close", handler);
            return {
                cancel() {
                    child.off("close", handler);
                }
            };
        },
        childProcesses: child,
    };
}

export function getMimeType(filePath: string) {
    return mime.lookup(filePath) || "application/octet-stream";
}

export function rest(p: string, sep: string = path.sep): string {
    return p.endsWith(sep) ? p + `**${sep}*` : p + `${sep}**${sep}*`;
}
