import { ElementOf } from "@/service/utils/type";

type TranslationDefinition = {
    headers: string[];
    translations: Record<string, string[]>;
};

const AppTranslations: TranslationDefinition = {
    headers: ["en-US", "zh-CN", "ja-JP"] as const,
    translations: {
        "app:crashed_critical_title": [
            "Oops! The app crashed",
            "哎呀！应用程序崩溃了",
            "申し訳ありません。アプリが異常終了しました",
        ],
        "app:crashed_critical_message": [
            "The app crashed with a fatal error. Please attach the error message below and contact the developer.",
            "应用程序因致命错误而崩溃。请附上下面的错误消息并联系开发者。",
            "アプリが重大なエラーにより異常終了しました。以下のエラーメッセージを添付のうえ、開発者までご連絡ください。",
        ],
    } as const,
};

export class Translation {
    public static translate(k: TranslationKey, lang: ElementOf<typeof AppTranslations.headers>): string {
        const translation = AppTranslations.translations[k];
        return translation[AppTranslations.headers.indexOf(lang)];
    }
}

export type TranslationKey = keyof typeof AppTranslations.translations;
