import { App } from "../electron";

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

export function translate(app: App): (key: string) => string {
    return (key: string) => {
        const lang = app.electronApp.getPreferredSystemLanguages();
        const langIndex = AppTranslations.headers.includes(lang[0]) ? AppTranslations.headers.indexOf(lang[0]) : 0;
        const translation = AppTranslations.translations[key];
        if (translation) {
            return translation[langIndex] || translation[0];
        }
        return key; // Fallback to the key itself if no translation is found
    }
}



