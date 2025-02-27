import {spawn} from "child_process";

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
