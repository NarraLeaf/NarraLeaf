export interface SavedGame {
    name: string;
    meta: {
        created: number;
        updated: number;
        id: string;
    };
    game: Record<string, any>;
}

export interface SavedGameMetadata {
    created: number;
    updated: number;
    id: string;
    isTemporary: boolean;
    capture?: string;
}
