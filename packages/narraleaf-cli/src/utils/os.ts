import { AppEventToken } from "@/types/app";
import {ValuesOf} from "@/utils/types";
import {spawn, ChildProcess} from "child_process";
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

export function safeExecuteFn<T>(fn: any) {
    if (typeof fn === "function") {
        return fn();
    }
}

export const PlatformSystem = {
    aix: "aix",
    android: "android",
    darwin: "darwin",
    freebsd: "freebsd",
    haiku: "haiku",
    linux: "linux",
    openbsd: "openbsd",
    sunos: "sunos",
    win32: "win32",
    cygwin: "cygwin",
    netbsd: "netbsd"
} as const;
export type PlatformInfo = {
    system: ValuesOf<typeof PlatformSystem>;
    arch: NodeJS.Architecture;
    nodeVersion: string;
    pid: number;
    cwd: string;
};

export class Platform {
    public static getInfo(process: NodeJS.Process): PlatformInfo {
        const system = process.platform;
        const arch = process.arch;
        const nodeVersion = process.versions.node;
        const pid = process.pid;
        const cwd = process.cwd();

        return {
            arch,
            cwd,
            nodeVersion,
            pid,
            system
        };
    }
}

export function exec(args: string[], process: NodeJS.Process): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(args[0], args.slice(1), {
            stdio: "inherit",
            shell: true,
            env: process.env,
            cwd: process.cwd()
        });

        child.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Process exited with code ${code}`));
            } else {
                resolve();
            }
        });
    });
}
