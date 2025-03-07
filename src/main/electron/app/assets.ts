
type AssetRuleDefinition = {
    include: RegExp | ((path: string) => boolean);
    exclude?: RegExp | ((path: string) => boolean);
    handler: (path: string) => AssetResolved | null;
};

export type AssetResolved = {
    path: string;
    noCache: boolean;
};

export class LocalAssets {
    private rules: AssetRuleDefinition[] = [];

    public addRule(rule: AssetRuleDefinition): this {
        this.rules.push(rule);
        return this;
    }

    public resolve(path: string): AssetResolved | null {
        const exec = (rule: RegExp | ((path: string) => boolean)): boolean => {
            if (rule instanceof RegExp) {
                return rule.test(path);
            } else {
                return rule(path);
            }
        };
        for (const rule of this.rules) {
            if (exec(rule.include) && (!rule.exclude || !exec(rule.exclude))) {
                return rule.handler(path);
            }
        }

        return null;
    }
}
