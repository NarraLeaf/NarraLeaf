

export function RouterErrorFallback({path}: {path?: string}) {
    return (
        <>
            <h1>Router Error</h1>
            <p>Something went wrong. Error details have been logged to the renderer console.</p>
            {path && <p>Source File Path: {path}</p>}
        </>
    );
}
