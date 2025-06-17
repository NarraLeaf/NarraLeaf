import React from "react";
import { HTMLMotionProps } from "motion/react";

export type PageProps = {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
} & HTMLMotionProps<"div">;

export function Page(props: PageProps) {
    return props.children;
}
