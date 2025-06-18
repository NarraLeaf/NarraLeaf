import styles from "@/client/_app/errorHandling/error-fallback.module.css";

export default function ErrorFallback() {
    return (
        <div className={styles.errorFallbackContainer}>
            <h1>Something went wrong...</h1>
            <p>NarraLeaf renderer crashed, error details have been logged to the renderer console.</p>
            <p>Note: In Production, the app will quit instead of showing this screen.</p>
        </div>
    );
}
