import styles from "@/client/components/errorHandling/base-app-error-fallback.module.css";
import { NarraLeaf } from "@/core/build/constants";

export function BaseAppErrorFallback() {
    const handleReload = () => {
        window[NarraLeaf].app.reload();
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {/* Cross icon */}
                <svg
                    className={styles.icon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <h1 className={styles.title}>App Error</h1>
                <p className={styles.message}>
                    Something went wrong. Error details have been logged to the renderer console.
                </p>
                <button className={styles.reloadButton} onClick={handleReload}>
                    Reload
                </button>
            </div>
        </div>
    );
}
