import React from "react";

export function useFlush(deps: React.DependencyList = []): [VoidFunction] {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    React.useEffect(() => {
        forceUpdate();
    }, deps);

    return [forceUpdate];
}
