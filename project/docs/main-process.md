# NarraLeaf main process — external API inventory

This document is the **source draft** for ecosystem docs. It lists everything a host app or extension author might depend on from the **`narraleaf` package main-process surface**, plus IPC/protocol/storage boundaries implemented in `packages/narraleaf`.

Comments and identifiers follow the codebase (English). Narrative is zh-CN friendly where helpful.

---

## 1. Stability tiers

| Tier | Meaning |
|------|---------|
| **Stable** | Exported from `narraleaf` entry (`packages/narraleaf/src/main/index.ts`). Intended semver commitment once the project declares 1.x API freeze. |
| **Implicit public** | `public` fields/methods on `App` / `AppWindow` not re-exported from `main/index.ts`. Consumers can still import types from emitted `.d.ts`; treat as **semver-sensitive**. |
| **IPC contract** | Channel names + payloads in `packages/narraleaf/src/shared/types/ipcEvents.ts`. Breaking changes affect preload/renderer bundles even if not exported from `main/index.ts`. |
| **Deprecated** | Kept for compatibility; plan migration away. |
| **Internal** | Implementation modules (`IPCHost`, `WindowInstance`, etc.). Do not import from deep paths unless you accept breakage. |

---

## 2. Package exports (`import "narraleaf"` / `"narraleaf/main"`)

Defined by [`packages/narraleaf/package.json`](../../packages/narraleaf/package.json) → [`packages/narraleaf/src/main/index.ts`](../../packages/narraleaf/src/main/index.ts).

| Export | Kind | Purpose |
|--------|------|---------|
| `App` | class | Electron main-process application host: lifecycle, hooks, storage façade, paths. |
| `AppConfig` | class | Configuration + `create()` → `App`. |
| `AppWindow` | class | Main `BrowserWindow` wrapper + IPC registration helpers + window ops. |
| `StoreProvider` | **type only** | Implement custom save backends (`AppConfig.baseConfig.store`). |
| `IPCEventType` | enum | Logical IPC event keys (suffix for channel names). |
| `Namespace` | enum | IPC namespace (`NarraLeaf` → `"narraleaf"`). |
| `IPCEvents`, `RequestStatus` | **types** | Typed IPC contract map + unified success/failure wrapper. |
| `assertSafeStorageKey`, `MAX_STORAGE_KEY_LENGTH` | fn / const | Same validation rules as save IDs / JSON store names (hosts implementing custom storage should reuse). |

**Not exported here but commonly needed:** build/config types live under `import "narraleaf/config"` ([`packages/narraleaf/src/config/index.ts`](../../packages/narraleaf/src/config/index.ts)) — re-exports from `@narraleaf/shared`, not runtime main classes.

**Note:** `package.json` declares `"bin": "./dist/cli.cjs"` but the narraleaf package build may not emit that entry; verify before documenting a CLI.

---

## 3. `AppConfig` — construction & config surface

Source: [`packages/narraleaf/src/main/app/config.ts`](../../packages/narraleaf/src/main/app/config.ts)

| Member | Stability | Summary |
|--------|-----------|---------|
| `constructor(baseConfig?)` | Stable | Deep-merges into `DefaultBaseConfig`. |
| `configure` / `configWindows` / `configLinux` / `configMac` | Stable | Platform-specific merge (e.g. `appIcon`). |
| `create(): App` | Stable | Preferred factory for `App`. |
| `getConfig(platformInfo)` | Stable | `BaseAppConfig` ∪ platform slice. |
| `getMainPlatform(platformInfo)` | Stable | Maps OS → `MainPlatform`. |

**`BaseAppConfig` highlights**

| Field | Role |
|-------|------|
| `forceSandbox` | Calls `app.enableSandbox()` during prepare. |
| `recoveryCreationInterval` | Exposed to renderer via `ClientAppConfiguration`. |
| `appErrorHandling` | `"terminate" \| "raw" \| "restart"` — crash UX policy signal. |
| `deleteCorruptedSaves` | Passed to default `LocalFile` store. |
| `store?: StoreProvider` | Optional injected save backend. |

---

## 4. `App` — runtime API

Source: [`packages/narraleaf/src/main/app/app.ts`](../../packages/narraleaf/src/main/app/app.ts)

### 4.1 Lifecycle & hooks

| API | Stability | Behavior |
|-----|-----------|----------|
| `onReady(cb)` | Stable | After `electronApp.whenReady()`, managers initialized, `crashManager.initialize()` (and dev metadata fetch). Returns `{ cancel() }`. |
| `HookEvents` + `hook` / `onceHook` / `unhook` / `emitHook` | Stable | Lightweight hook bus (`AfterReady`, `AfterMainWindowClose`, `OnTerminate`). |
| `launchApp(partial WindowConfig?)` | Stable | Creates main window via `WindowManager` (throws if not ready or window exists). |
| `quit()` | Stable | `electronApp.quit()`. |
| `crash(reason?, { disableRecovery? })` | Stable | Delegates to `CrashManager`. |

### 4.2 Paths & packaging

| API | Stability | Notes |
|-----|-----------|-------|
| `getPreloadScript()` | Stable | Packaged vs dev preload path. |
| `getEntryFile()` | Stable | File path **or** dev HTTP URL when `DevToolManager` metadata enables HTTP mode. |
| `getAppPath()` / `getRendererBuildDir()` / `getPublicDir()` | Stable | Build layout + dev overrides from dev-server metadata. |
| `getUserDataDir()` | Stable | After dev override: `…/userData-dev` when not packaged. |
| `isPackaged()` | Stable | |
| `isHttpDevServerMode()` | Stable | |

### 4.3 Storage façade

| API | Stability | Notes |
|-----|-----------|-------|
| `createJsonStore(name)` | Stable | File-backed JSON under `AppDataNamespace.json`. **Name must pass `assertSafeStorageKey`.** |
| `createExposedJsonStore` / `exposeJsonStore` | **Deprecated** | Exposes store to IPC (`app.store.*`). Prefer explicit domain APIs long-term. |
| `saveGameData` / `readGameData` / `listGameData` / `deleteGameData` | Stable | Delegates to `StorageManager` → `StoreProvider`. **IDs validated** (`assertSafeStorageKey`). |

### 4.4 Implicit public: manager fields

These are **public** on `App` but not re-exported from `main/index.ts`:

`translationManager`, `crashManager`, `devToolManager`, `menuManager`, `protocolManager`, `storageManager`, `windowManager`

**Guidance:** Prefer `App` methods for stable behavior; direct manager access is for advanced integration and may change more often.

---

## 5. `AppWindow` & `WindowManager`

Sources:

- [`packages/narraleaf/src/main/app/mgr/window/appWindow.ts`](../../packages/narraleaf/src/main/app/mgr/window/appWindow.ts)
- [`packages/narraleaf/src/main/app/mgr/window/windowProxy.ts`](../../packages/narraleaf/src/main/app/mgr/window/windowProxy.ts)
- [`packages/narraleaf/src/main/app/mgr/windowManager.ts`](../../packages/narraleaf/src/main/app/mgr/windowManager.ts)

### 5.1 `WindowManager`

| API | Stability | Summary |
|-----|-----------|---------|
| `events` (`window-created`, `window-ready`) | Implicit public | `EventEmitter`. |
| `launchMainWindow` / `createMainWindow` | Implicit public | Loads URL vs file; registers default IPC handlers; applies `appIcon` rules. |
| `getMainWindow` / `closeMainWindow` | Implicit public | |

### 5.2 `AppWindow`

| API | Stability | Summary |
|-----|-----------|---------|
| `registerIPCHandler(handler)` | Implicit public | Extend IPC surface with custom `IPCHandler` implementations. |
| `handleUserEvent` / `invokeUserEvent` / `offUserEvent` | Implicit public | String-keyed host handlers wired from IPC `app.event.requestMain`. `invokeUserEvent` performs **single-step** lookup+invoke (`WindowUserHandlers.invoke`) to avoid check-then-invoke races with `offUserEvent`. Result is a discriminated outcome: registered handlers yield data; missing registration yields `not_registered`. |
| `onClose` / `onEvent` | Implicit public | Window event bridge (`WindowEventManager`). |
| `getClientAppConfig()` | Implicit public | Subset of config exposed to renderer (`recoveryCreationInterval`, `appErrorHandling`). |
| Window ops (`loadURL`, `loadFile`, fullscreen, `reload`, devtools, `installExtension`, …) | Implicit public | Thin wrappers over Electron. |

---

## 6. IPC contract (main registers, preload/renderer invokes)

### 6.1 Naming

Source: [`packages/narraleaf/src/shared/types/ipc.ts`](../../packages/narraleaf/src/shared/types/ipc.ts)

For namespace `narraleaf`:

- Request channel: `narraleaf:<IPCEventType value>`
- Reply sub-channel (host→renderer during `IPCHost.invoke`): `narraleaf.reply:<key>`

### 6.2 Logical events

Source: [`packages/narraleaf/src/shared/types/ipcEvents.ts`](../../packages/narraleaf/src/shared/types/ipcEvents.ts)

Registered by default in [`windowManager.ts`](../../packages/narraleaf/src/main/app/mgr/windowManager.ts) (`registerIPCHandlers`).

| `IPCEventType` | Style | Payload → Response | Handler module |
|----------------|-------|-------------------|----------------|
| `getPlatform` | request | `{}` → `AppInfo` | `appInfo.ts` |
| `app.reload` | message | `{}` | `appAction.ts` |
| `app.terminate` | message | `{ err: string \| null }` | `appAction.ts` |
| `app.event.requestMain` | request | `{ event: string, payload: any }` → `any` | `appAction.ts` |
| `app.store.getJson` | request | `{ name }` → `Record<string, unknown>` | `appStore.ts` |
| `app.store.saveJson` | request | `{ name, data }` → `void` | `appStore.ts` |
| `game.save.save` | request | `{ gameData, type, id, preview? }` → `void` | `gameSave.ts` |
| `game.save.read` | request | `{ id }` → `SavedGameResult \| null` | `gameSave.ts` |
| `game.save.list` | request | `{}` → `SavedGameMeta[]` | `gameSave.ts` |
| `game.save.delete` | request | `{ id }` → `void` | `gameSave.ts` |

All **request** handlers return `RequestStatus<T>` (`success` + `data` **or** `error` string) via `WindowIPC` / `IPCHandler.tryUse`.

### 6.3 Save ID & JSON store name rules

Implementation: [`packages/narraleaf/src/main/utils/safeStorageKey.ts`](../../packages/narraleaf/src/main/utils/safeStorageKey.ts)

Opaque filesystem keys must:

- Be non-empty, length ≤ `MAX_STORAGE_KEY_LENGTH` (200)
- Be a single path segment (no `/`, `\`)
- Not contain `..`
- Match `^[a-zA-Z0-9_.-]+$`

This applies to **game save IDs** and **JSON store file names** used with `JsonStore` / IPC `app.store.*`.

---

## 7. Preload bridge (contract consumer)

Source: [`packages/narraleaf/src/main/preload/preload.ts`](../../packages/narraleaf/src/main/preload/preload.ts)

Exposes `window[NarraLeaf]` (constant from `@narraleaf/shared`). Global typing: [`packages/narraleaf/src/shared/types/global.ts`](../../packages/narraleaf/src/shared/types/global.ts).

**Gap to track:** typings list `game.save.*` helpers but **do not** currently declare `delete`; IPC `game.save.delete` still exists on the main side — align typings/preload when you formalize renderer docs.

---

## 8. Custom protocol (`app://`)

Sources:

- [`packages/narraleaf/src/main/app/mgr/protocolManager.ts`](../../packages/narraleaf/src/main/app/mgr/protocolManager.ts)
- [`packages/narraleaf/src/main/app/mgr/protocol/fileSystemHandler.ts`](../../packages/narraleaf/src/main/app/mgr/protocol/fileSystemHandler.ts)
- Constants: `@narraleaf/shared` (`AppProtocol`, `AppHost`)

Built-in hosts:

| Host | Maps to |
|------|---------|
| `app://public/...` | `App.getPublicDir()` |
| `app://root/...` | `App.getAppPath()` |
| `app://renderer/...` | `App.getRendererBuildDir()` (no-store cache headers by default) |

**Security posture:** URL path segments are decoded and rejected for `.` / `..`; resolved paths must stay **inside** the configured base directory.

Hosts may call `protocolManager.registerHandler` for additional schemes — mind initialization order (`registerSchemesAsPrivileged` runs during `ProtocolManager.initialize()`).

---

## 9. Default save implementation (`LocalFile`)

Source: [`packages/narraleaf/src/main/app/mgr/storage/fileSystem/localFile.ts`](../../packages/narraleaf/src/main/app/mgr/storage/fileSystem/localFile.ts)

- Files live under `AppDataNamespace.save` (`msg_storage`) as `<id>.dat`.
- **Serialized operations:** public methods queue through an internal chain to reduce concurrent save vs retention races.
- Quicksave / recovery retention uses config caps (`maxTemporary`, `maxRecoveries`, `forceDelete`).

**Residual risk:** format-level atomic commit (temp + rename) is not implemented; serialisation mitigates but does not replace crash-safe single-file writes.

---

## 10. Developer tooling channel (WebSocket)

Source: [`packages/narraleaf/src/main/app/mgr/devToolManager.ts`](../../packages/narraleaf/src/main/app/mgr/devToolManager.ts)

Non-packaged builds connect to the CLI dev server for metadata + commands (quit/reload). Treat as **integration surface** between `narraleaf` and `narraleaf-cli`, not as a stable third-party API yet.

---

## 11. Recommended **new** host-facing APIs (backlog)

| Need | Proposal |
|------|----------|
| Menu injection | `MenuManager.registerTemplate(provider)` or callback style builder (currently empty template). |
| Single-instance / deep links | Wrap `second-instance`, `open-file`, `open-url` with typed events on `App`. |
| Explicit capability model | Replace implicit trust of “same webContents” with named capabilities per IPC channel. |
| Formal CLI story | Either ship `dist/cli.cjs` from source or remove `bin` field until real. |
| Renderer-safe JSON/settings API | Replace deprecated generic JSON IPC with versioned, schema’d channels. |

---

## 12. Rewrite / deprecation candidates

| Surface | Why |
|---------|-----|
| `app.event.requestMain` | `string` + `any` RPC tunnel expands privilege sprawl; replace with typed IPC per capability or a registered capability registry with explicit schemas. |
| `app.store.*` + `exposeJsonStore` | Deprecated pattern + whole-object overwrite; easy to misuse across layers. |
| `IPCHost` static listener tables | Process-global registration complicates multi-window / rebuild scenarios — prefer per-window registries + teardown guarantees. |
| `app://root` broad host | Narrow what “root” exposes or split hosts by sensitivity. |

---

## 13. Audit-driven behavior changes (this iteration)

- Save IDs / JSON store names: validated (`assertSafeStorageKey`) at IPC handlers, `App` storage methods, `JsonStore`, and `LocalFile` path resolution + containment checks.
- `LocalFile`: serialized public operations to reduce concurrent write/cleanup hazards.
- `JsonStore`: filesystem helpers now surface failures (`Fs.*` results checked).
- `FileSystemHandler.formatFileUrl`: rejects traversal / escaped segments.
- `app.event.requestMain`: dispatch uses **single-step** handler lookup via `AppWindow.invokeUserEvent` → `WindowUserHandlers.invoke` to avoid TOCTOU false successes.

---

## 14. Related files (quick index)

| Concern | Path |
|---------|------|
| IPC enum & payloads | `packages/narraleaf/src/shared/types/ipcEvents.ts` |
| IPC naming helpers | `packages/narraleaf/src/shared/types/ipc.ts` |
| IPC host routing | `packages/narraleaf/src/main/app/mgr/window/ipcHost.ts` |
| Preload IPC client | `packages/narraleaf/src/main/preload/data/ipcClient.ts` |
| Crash handling | `packages/narraleaf/src/main/app/mgr/crashManager.ts` |
| Translation hook | `packages/narraleaf/src/main/app/mgr/translationManager.ts` |
