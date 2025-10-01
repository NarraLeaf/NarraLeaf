

export class Singleton {
    private static instance: Singleton;
    private constructor() {}

    static getInstance() {
        if (!Singleton.instance) {
            Singleton.instance = new Singleton();
        }
        return Singleton.instance;
    }
}
