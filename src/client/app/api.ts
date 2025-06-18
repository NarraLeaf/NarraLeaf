import { NarraLeafMainWorldProperty } from "@/core/build/constants";

export class AppAPI {
    constructor(
        private readonly api: typeof window[typeof NarraLeafMainWorldProperty],
    ) {}
}

