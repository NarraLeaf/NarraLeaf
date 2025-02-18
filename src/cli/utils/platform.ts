import {ValuesOf} from "../types";
import {spawn} from "child_process";

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

