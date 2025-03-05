import React from "react";

type NarraLeafReact = typeof import("narraleaf-react");

const AppPlayer = ({story, children, lib}: {
    story: InstanceType<NarraLeafReact["Story"]>;
    children: React.ReactNode;
    lib: NarraLeafReact;
}) => {
    return (
        <>
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
        </>
    );
}

export {AppPlayer};

