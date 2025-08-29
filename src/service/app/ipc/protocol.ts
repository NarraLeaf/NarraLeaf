import { SavedGameMeta } from "@/client";
import { SavedGame } from "narraleaf-react";
import {
  WindowCreatePayload,
  WindowMaximizePayload,
  WindowMinimizePayload,
  WindowClosePayload,
  WindowShowPayload,
  WindowHidePayload,
  WindowFocusPayload,
  WindowPositionPayload,
  WindowSizePayload,
  WindowTitlePayload,
  WindowCenterPayload,
  WindowDecorationsPayload,
  OpenDialogOptions,
  SaveDialogOptions,
  MessageDialogOptions,
  ConfirmDialogOptions,
  OpenOptions,
  Error
} from "./types";

/**
 * "narraleaf:" namespace
 */

export type ServiceRequestResult = {
    "narraleaf:game.save.list": SavedGameMeta[];
    "narraleaf:game.save.read": SavedGame;
    "narraleaf:game.save.write": void;
    "narraleaf:game.save.delete": void;
    "narraleaf:app.quit": void;
    "narraleaf:app.reload": void;
    "narraleaf:app.request": any;
};

export type ServiceRequestPayload = {
    "narraleaf:game.save.list": null;
    "narraleaf:game.save.read": { id: string };
    "narraleaf:game.save.write": { id: string; data: SavedGame };
    "narraleaf:game.save.delete": { id: string };
    "narraleaf:app.quit": { reason?: Error | null };
    "narraleaf:app.reload": null;
    "narraleaf:app.request": { payload: any };
};

export type RuntimeAppMetadata = {
    userDir: string;
    appDir: string;
    appName: string;
    appVersion: string;
    preferredSystemLanguage: string;
    osType: string;
    osVersion: string;
    architecture: string;
    timezone: string;
    isPackage: boolean;
};

/**
 * "tauri:" namespace
 */
export type RuntimeRequestResult = {
    "tauri:window.create": void;
    "tauri:window.maximize": void;
    "tauri:window.minimize": void;
    "tauri:window.close": void;
    "tauri:window.show": void;
    "tauri:window.hide": void;
    "tauri:window.set_focus": void;
    "tauri:window.set_position": void;
    "tauri:window.set_size": void;
    "tauri:window.set_title": void;
    "tauri:window.center": void;
    "tauri:window.set_decorations": void;
    "tauri:dialog.open": string | null;
    "tauri:dialog.save": string | null;
    "tauri:dialog.message": void;
    "tauri:dialog.ask": boolean;
    "tauri:clipboard.write_text": void;
    "tauri:clipboard.read_text": string | null;

    "tauri:app.get_version": string;
    "tauri:app.get_name": string;
    "tauri:app.get_tauri_version": string;
    "tauri:app.show": void;
    "tauri:app.hide": void;
    "tauri:app.quit": void;

    "tauri:ping": number;
    "tauri:shell.open": void;
    "tauri:app.get_metadata": RuntimeAppMetadata;
};

export type RuntimeRequestPayload = {
    "tauri:window.create": WindowCreatePayload;
    "tauri:window.maximize": WindowMaximizePayload;
    "tauri:window.minimize": WindowMinimizePayload;
    "tauri:window.close": WindowClosePayload;
    "tauri:window.show": WindowShowPayload;
    "tauri:window.hide": WindowHidePayload;
    "tauri:window.set_focus": WindowFocusPayload;
    "tauri:window.set_position": WindowPositionPayload;
    "tauri:window.set_size": WindowSizePayload;
    "tauri:window.set_title": WindowTitlePayload;
    "tauri:window.center": WindowCenterPayload;
    "tauri:window.set_decorations": WindowDecorationsPayload;
    "tauri:dialog.open": OpenDialogOptions | undefined;
    "tauri:dialog.save": SaveDialogOptions | undefined;
    "tauri:dialog.message": { message: string; options?: MessageDialogOptions };
    "tauri:dialog.ask": { message: string; options?: ConfirmDialogOptions };
    "tauri:clipboard.write_text": { text: string };
    "tauri:clipboard.read_text": null;

    "tauri:app.get_version": null;
    "tauri:app.get_name": null;
    "tauri:app.get_tauri_version": null;
    "tauri:app.show": null;
    "tauri:app.hide": null;
    "tauri:app.quit": null;

    "tauri:ping": null;
    "tauri:shell.open": { path: string; options?: OpenOptions };
    "tauri:app.get_metadata": null;
};

export type ServiceRequestTypes = Extract<keyof ServiceRequestResult, keyof ServiceRequestPayload>;
export type RuntimeRequestTypes = Extract<keyof RuntimeRequestResult, keyof RuntimeRequestPayload>;