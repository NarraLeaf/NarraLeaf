
export function remove<T>(array: T[], value: T): void {
    const index = array.indexOf(value);
    if (index !== -1) {
        array.splice(index, 1);
    }
}

export class AsyncTaskQueue {
    private tasks: Array<() => Promise<void>> = [];
    private isRunning: boolean = false;

    public push(task: () => Promise<void>): this {
        this.tasks.push(task);
        this.processQueue();
        return this;
    }

    public clear(): this {
        this.tasks = [];
        return this;
    }

    private async processQueue(): Promise<void> {
        if (this.isRunning) return;

        this.isRunning = true;
        while (this.tasks.length > 0) {
            const task = this.tasks.shift();
            if (task) {
                await task();
            }
        }
        this.isRunning = false;
    }
}
