import { IPCEventType, RequestStatus } from "@/core/ipc/events";
import { IPCMessageType } from "@/core/ipc/ipc";
import { SavedGame } from "narraleaf-react";
import { AppWindow } from "../appWindow";
import { IPCHandler, IPCHandlerProps } from "./IPCHandler";

export class GameSaveGameHandler extends IPCHandler<IPCEventType.gameSaveGame> {
    readonly name = IPCEventType.gameSaveGame;
    readonly type = IPCMessageType.request;

    public async handle(window: AppWindow, {gameData, type, id, preview}: IPCHandlerProps<IPCEventType.gameSaveGame>) {
        return this.tryUse(() => window.app.saveGameData(gameData as SavedGame, type, id, preview));
    }
}

export class GameReadGameHandler extends IPCHandler<IPCEventType.gameReadGame> {
    readonly name = IPCEventType.gameReadGame;
    readonly type = IPCMessageType.request;

    public async handle(window: AppWindow, {id}: IPCHandlerProps<IPCEventType.gameReadGame>) {
        return this.tryUse(() => window.app.readGameData(id));
    }
}

export class GameListGameHandler extends IPCHandler<IPCEventType.gameListGame> {
    readonly name = IPCEventType.gameListGame;
    readonly type = IPCMessageType.request;

    public async handle(window: AppWindow) {
        return this.tryUse(() => window.app.listGameData());
    }
}

export class GameDeleteGameHandler extends IPCHandler<IPCEventType.gameDeleteGame> {
    readonly name = IPCEventType.gameDeleteGame;
    readonly type = IPCMessageType.request;

    public async handle(window: AppWindow, {id}: IPCHandlerProps<IPCEventType.gameDeleteGame>) {
        return this.tryUse(() => window.app.deleteGameData(id));
    }
}
