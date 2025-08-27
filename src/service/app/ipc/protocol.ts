import { SavedGameMeta } from "@/client";
import { SavedGame } from "narraleaf-react";
import {
  Permission,
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
  NotificationOptions,
  FetchOptions,
  OpenOptions,
  Menu,
  MenuOptions,
  MenuItem,
  ShortcutHandler,
  Error
} from "./types";

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
    "narraleaf:game.save.list": [void];
    "narraleaf:game.save.read": [id: string];
    "narraleaf:game.save.write": [id: string, data: SavedGame];
    "narraleaf:game.save.delete": [id: string];
    "narraleaf:app.quit": [reason?: Error | null];
    "narraleaf:app.reload": [void];
    "narraleaf:app.request": [payload: any];
};

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
    "tauri:notification.request_permission": Permission;
    "tauri:notification.is_permission_granted": boolean;
    "tauri:notification.show": void;
    "tauri:http.fetch": Response;
    "tauri:app.get_version": string;
    "tauri:app.get_name": string;
    "tauri:app.get_tauri_version": string;
    "tauri:app.show": void;
    "tauri:app.hide": void;
    "tauri:app.quit": void;
    "tauri:system_tray.set_icon": void;
    "tauri:system_tray.set_menu": void;
    "tauri:system_tray.set_tooltip": void;
    "tauri:system_tray.set_title": void;
    "tauri:global_shortcut.register": void;
    "tauri:global_shortcut.unregister": void;
    "tauri:global_shortcut.is_registered": boolean;
    "tauri:menu.create": Menu;
    "tauri:menu.append": void;
    "tauri:menu.insert": void;
    "tauri:menu.remove": void;
    "tauri:ping": number;
    "tauri:shell.open": void;
};

export type RuntimeRequestPayload = {
    "tauri:window.create": [WindowCreatePayload];
    "tauri:window.maximize": [WindowMaximizePayload];
    "tauri:window.minimize": [WindowMinimizePayload];
    "tauri:window.close": [WindowClosePayload];
    "tauri:window.show": [WindowShowPayload];
    "tauri:window.hide": [WindowHidePayload];
    "tauri:window.set_focus": [WindowFocusPayload];
    "tauri:window.set_position": [WindowPositionPayload];
    "tauri:window.set_size": [WindowSizePayload];
    "tauri:window.set_title": [WindowTitlePayload];
    "tauri:window.center": [WindowCenterPayload];
    "tauri:window.set_decorations": [WindowDecorationsPayload];
    "tauri:dialog.open": [OpenDialogOptions | undefined];
    "tauri:dialog.save": [SaveDialogOptions | undefined];
    "tauri:dialog.message": [string, MessageDialogOptions | undefined];
    "tauri:dialog.ask": [string, ConfirmDialogOptions | undefined];
    "tauri:clipboard.write_text": [string];
    "tauri:clipboard.read_text": [void];
    "tauri:notification.request_permission": [void];
    "tauri:notification.is_permission_granted": [void];
    "tauri:notification.show": [NotificationOptions];
    "tauri:http.fetch": [string, FetchOptions | undefined];
    "tauri:app.get_version": [void];
    "tauri:app.get_name": [void];
    "tauri:app.get_tauri_version": [void];
    "tauri:app.show": [void];
    "tauri:app.hide": [void];
    "tauri:app.quit": [void];
    "tauri:system_tray.set_icon": [string | Uint8Array];
    "tauri:system_tray.set_menu": [Menu];
    "tauri:system_tray.set_tooltip": [string];
    "tauri:system_tray.set_title": [string];
    "tauri:global_shortcut.register": [string, ShortcutHandler];
    "tauri:global_shortcut.unregister": [string];
    "tauri:global_shortcut.is_registered": [string];
    "tauri:menu.create": [MenuOptions];
    "tauri:menu.append": [string, MenuItem];
    "tauri:menu.insert": [string, number, MenuItem];
    "tauri:menu.remove": [string, string];
    "tauri:ping": [void];
    "tauri:shell.open": [string, OpenOptions | undefined];
};

export type ServiceRequestTypes = Extract<keyof ServiceRequestResult, keyof ServiceRequestPayload>;
export type RuntimeRequestTypes = Extract<keyof RuntimeRequestResult, keyof RuntimeRequestPayload>;