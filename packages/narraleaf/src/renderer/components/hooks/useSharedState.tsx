import { useEffect, useState } from "react";

export type SharedStateHookResult<T extends Record<string, any>> = [];
export type SharedStateHookOptions<T extends Record<string, any>> = {
    frozen: boolean;
};
export type SharedStateStatus<T extends Record<string, any>> = {
    data: T | null;
    fetching: boolean;
    error: string | null;

    refetch: () => Promise<void>;
};

export function useSharedState<T extends Record<string, any>>(key: string, options: SharedStateHookOptions<T>): SharedStateHookResult<T> {
}