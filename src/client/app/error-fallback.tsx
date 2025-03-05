

export default function ErrorFallback() {
    return (
        <div>
            <h1>Something went wrong...</h1>
            <p>
                NarraLeaf crashed, error details have been logged to the renderer console.
                Note: In Production, the app will quit instead of showing this screen.
            </p>
        </div>
    );
}
