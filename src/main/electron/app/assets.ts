
type AssetRuleDefinition = {
    include: RegExp | ((path: string) => boolean);
    exclude?: RegExp | ((path: string) => boolean);
    handler: (path: string) => string;
};

export class LocalAssets {
    private rules: AssetRuleDefinition[] = [];

    public addRule(rule: AssetRuleDefinition) {
        this.rules.push(rule);
    }

    public resolve(path: string): string | null {
        const exec = (rule: RegExp | ((path: string) => boolean) | undefined): boolean => {
            if (!rule) {
                return true;
            } else if (rule instanceof RegExp) {
                return rule.test(path);
            } else {
                return rule(path);
            }
        };
        for (const rule of this.rules) {
            if (exec(rule.include) && !exec(rule.exclude)) {
                return rule.handler(path);
            }
        }

        return null;
    }
}
