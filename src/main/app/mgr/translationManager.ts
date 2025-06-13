import { App } from "@/main/app/app";

type TranslationDefinition = {
    headers: string[];
    translations: Record<string, string[]>;
};

const AppTranslations: TranslationDefinition = {
    headers: ["en-US", "zh-CN", "ja-JP"],
    translations: {
        "app:crashed_critical_title": [
            "Oops! The app crashed",
            "哎呀！应用程序崩溃了",
            "おっと！アプリがクラッシュしました",
        ],
        "app:crashed_critical_message": [
            "The app crashed with a fatal error. Please attach the error message below and contact the developer.",
            "应用程序因致命错误而崩溃。请附上下面的错误消息并联系开发者。",
            "アプリが致命的なエラーでクラッシュしました。以下のエラーメッセージを添付して、開発者に連絡してください。",
        ],
    },
}

export class TranslationManager {
    private app: App;
    private currentLangIndex: number = 0;

    constructor(app: App) {
        this.app = app;
    }

    public initialize(): void {
        this.updateLanguage();
    }

    private updateLanguage(): void {
        const lang = this.app.electronApp.getPreferredSystemLanguages();
        this.currentLangIndex = AppTranslations.headers.includes(lang[0]) 
            ? AppTranslations.headers.indexOf(lang[0]) 
            : 0;
    }

    public translate(key: string): string {
        const translation = AppTranslations.translations[key];
        if (translation) {
            return translation[this.currentLangIndex] || translation[0];
        }
        return key; // Fallback to the key itself if no translation is found
    }

    public getCurrentLanguage(): string {
        return AppTranslations.headers[this.currentLangIndex];
    }

    public getAvailableLanguages(): string[] {
        return [...AppTranslations.headers];
    }
}

// For backward compatibility
export function translate(app: App): (key: string) => string {
    const manager = new TranslationManager(app);
    return (key: string) => manager.translate(key);
}



