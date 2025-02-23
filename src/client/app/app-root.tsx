import React from "react";

type NarraLeafReact = typeof import("narraleaf-react");

const AppRoot = ({story, children, lib}: {
    story: InstanceType<NarraLeafReact["Story"]>;
    children: React.ReactNode;
    lib: NarraLeafReact;
}) => {
    return (
        <>
            <lib.GameProviders>
                <lib.Player
                    story={story}
                    onReady={({liveGame}) => {
                        liveGame.newGame();
                    }}
                    width="100%"
                    height="100%"
                >
                    {children}
                </lib.Player>
            </lib.GameProviders>
        </>
    );
}

export {AppRoot};

