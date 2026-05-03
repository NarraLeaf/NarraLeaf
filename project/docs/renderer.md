# NarraLeaf Renderer 外部接口（`narraleaf/renderer`）

本文档描述 **渲染进程包** 对外可用的入口与类型，对应 `packages/narraleaf` 的 **`exports["./renderer"]`**。  
**不包含** Electron `main` / `preload` 的实现细节；宿主桥接仅通过 `window.NarraLeaf`（类型见 `packages/narraleaf/src/shared/types/global.ts`）体现。

---

## 包入口与稳定性约定

| 层级 | 含义 |
|------|------|
| **stable** | 适合扩展与 CLI 生成代码依赖；语义变更应按 semver 处理。 |
| **escape hatch** | 功能可用但缺少强类型约束，适合渐进迁移前使用。 |
| **internal** | 仅供包内或深度耦合代码使用；路径别名 `@renderer/*` 不代表对外承诺。 |

---

## 值导出（运行时）

| 符号 | 稳定性 | 说明 |
|------|--------|------|
| `render(config)` | stable | 挂载 renderer 根组件；环境非法或配置缺失会抛错；若在获取平台信息失败时会终止宿主进程并 **立即返回**，不再挂载。 |
| `useApp()` | stable | 返回 `RendererApp`（运行时 `App` 实例的受控子集），用于导航、存档、应用状态等，而非暴露内部实现细节。 |
| `useAppState(key)` | stable | 订阅 `App` 上的偏好状态（当前键：`isPlaying`）；卸载时会取消订阅。 |
| `useGamePlayback()` | stable | 基于 `useAppState("isPlaying")` 的只读封装。 |
| `useCurrentSaved()` | stable | 从 LiveGame 序列化当前可存档快照（失败时返回 `null`）。 |
| `useCurrentSavedRef()` | stable | 同上，但以 ref 维护最新快照。 |
| `useSaveAction()` | stable | 存档读写与 quick 系列；**写入失败会 `throw`**（不再静默成功）。 |
| `useSavedGames(deps?)` | stable | 列出存档元数据；`refetch` 返回 `Promise<void>`，串行队列在单次失败后仍可继续刷新。 |
| `readGame(id)` | stable | 非 hook 的读档辅助函数；桥接失败时 `throw`。 |
| `requestMain(event, payload?)` | escape hatch | 字符串 RPC；成功返回 data，失败 `throw Error`。强类型事件请用 `invokeMainEvent`。 |
| `invokeMainEvent(event, payload)` | stable（需扩展注册表） | 依赖 `MainProcessEventMap` 的类型安全封装；**默认注册表为空**，需在项目中通过 declaration merging 声明事件后再调用。 |
| `SaveType` | stable | 存档类型枚举（与 `@shared/types/save` 一致）。 |

---

## 类型导出（主要）

### 启动与路由树（CLI 与手写入口共用）

- **`RendererAppRootProps`** — `render()` 的配置：`renderer`（`createRoot` 封装）、`App` 用户壳组件、`appRouterData`、`metadata.story`。
- **`AppRouterModuleData` / `ProductionAppRouterModuleData`** — 路由模块树（开发/生产形态）；与 CLI 生成的 `renderer-entry` 一致。
- **`LayoutModuleDir` / `ProductionLayoutModuleDir` / `PageModuleData` / `ProductionPageModuleData` / `LayoutModule` / `PageModule`** — 页面与布局模块形状。

### 存档相关

- **`UseSaveActionResult` / `UseSavedGameResult`** — hooks 返回值类型。
- **`SavedGameMeta` / `SavedGameMetaData`** — 存档元数据（后者来自 `narraleaf-react`）。

### 应用句柄

- **`RendererApp`** — `useApp()` 的稳定类型：`config`、`state`、游戏生命周期与 `GameAPI` 上的桥接方法（不含内部 `events` 等实现细节）。

### 主进程 RPC 注册表（可扩展）

- **`MainProcessEventEntry<P, R>`** — 单条事件的 payload/response 描述。
- **`MainProcessEventMap`** — 空接口，供下游 **declaration merging** 扩展：

```ts
// typings/narraleaf-renderer-augmentation.d.ts
import type { MainProcessEventEntry } from "narraleaf/renderer";

declare module "narraleaf/renderer" {
    interface MainProcessEventMap {
        "example:ping": MainProcessEventEntry<{ id: string }, { ok: boolean }>;
    }
}
```

扩展后可通过 `invokeMainEvent("example:ping", { id: "x" })` 获得类型推断。

### 播放状态

- **`GamePlaybackState`** — `useGamePlayback()` 的返回形状（`isPlaying`）。

---

## 已从根入口收敛的类型（不再从 `narraleaf/renderer` 顶层导出）

以下类型仍可在包内通过 `@renderer/app/app.types` 使用，但 **不再作为对外稳定面** 从子路径重复导出：

- `AppConfig` — 内部运行时拼装。
- `NLReact` 命名空间导出 — 已移除（避免把构建时依赖泄漏给生态）。

---

## 近期契约修正摘要（破坏性语义）

1. **`render`** — 获取 `AppInfo` 失败时不再继续用空的 `appInfo` 挂载。
2. **存档写入** — `useSaveAction().save` / `quickSave`、`AppAPI.createRecovery` 在 `success: false` 时 **抛出错误**。
3. **`quickRead`** — 与 `read` 一致，桥接失败时 **抛出错误**（不再返回 `null` 掩盖失败）。
4. **`useSavedGames().refetch`** — 类型为 `() => Promise<void>`，且拒绝链不会阻塞后续刷新。

---

## 非目标（本文档不展开）

- `packages/narraleaf/src/main/**` 与 preload 实现。
- `narraleaf-cli` 构建管线（仅消费 `render` 等入口）。
