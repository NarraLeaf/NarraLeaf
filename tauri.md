# Tauri迁移指南

本指南用于指导 Agent 和其他开发者进行 **Electron → Tauri** 的迁移工作，统一项目结构与通信机制。

---

## 项目结构

项目结构基本保持不变：

* **cli** - 命令行工具

  * 调用 webpack 打包主进程、渲染器，并调用 Tauri 打包器
  * 需要重写打包主进程逻辑，确保 Tauri 能将 Node 打包为 Sidecar

* **client** - 渲染器

  * React 应用，需重构为通过单一的 Rust IPC 请求主进程 API
  * 禁止直接调用 Tauri API

* **core** - 核心库

  * 包含游戏运行与应用打包逻辑
  * 需要部分 Rust 实现（例如权限操作、打包流程）

* **main** - 主进程

  * 提供 NarraLeaf 特有 API（窗口管理、存档、游戏逻辑等）
  * NodeJS 进程（njs），作为 Sidecar 被 summon

* **preload** - 弃用

---

## 迁移思路

### 1. 主进程

主进程的逻辑将分为 **Rust进程（Tauri Host）** 与 **NodeJS进程（Service Sidecar）**：

* **Rust 进程**

  * 在用户视角是 "Tauri runtime"
  * 仅暴露一个通用的 `request_ipc(type, payload)` API 给渲染器
  * 对渲染器请求进行鉴权与转发
  * 负责召唤并管理 njs Sidecar

* **NodeJS 进程（njs）**

  * 在用户视角是 "主进程"
  * 提供 NarraLeaf 的 API（窗口管理、存档、游戏逻辑）
  * 通过 **Unix Domain Socket/Named Pipe** 与 Rust 通信
  * API 全部改为异步，确保无阻塞

> 结构：
> `renderer <-> rust (IPC) <-> njs (service sidecar)`

这种方式确保：

* 渲染器不能直接访问 Tauri API
* 任何操作都必须经过 njs 进程
* 权限隔离与安全性更高

#### 打包方式

* 使用 webpack 打包 njs 主进程
* 与 Node runtime 一起封装为独立 exe
* 在 `tauri.conf.json` 中注册为 Sidecar，由 Rust 进程调用

---

### 2. 渲染器

* 渲染器通过 `NarraLeaf/client` 库发起 API 请求：

  ```ts
  import { request } from "narraleaf/client"

  await request("saveGame", { slot: 1, data: saveData })
  ```

* `request` 内部调用 `request_ipc(type, payload)`，由 Rust 进程转发至 njs

* **权限控制**：

  * 使用 `allowlist` 与 `dangerousDisableIsolation`
  * 禁止渲染器访问任何 Tauri API（除了 `request_ipc`）
  * 每次请求携带启动时生成的 **token**
  * Rust 进程验证 token，未通过则拒绝转发

* **预设 API**：

  * 窗口管理
  * 存档管理
  * 游戏逻辑（配置、状态）

#### 资源获取

* 使用自定义协议 `app://` 替代直接文件路径

* 流程：

  1. 渲染器请求 `app://assets/bg.png`
  2. Rust 捕获 → 转发 njs
  3. njs 对链接就行鉴权、用户代码控制后解析为网络链接或`tauri`协议
  4. rust 接收解析后的链接后请求文件或网络资源返回给渲染器

* 优势：

  * 可在 njs 层进行鉴权
  * 可以实现网络请求白名单（比 CSP 更灵活）

* **关于打包**

  * Tauri 默认不会像 Electron 的 `asar` 那样整体封装
  * 静态资源会打包进 `AppImage/NSIS/DMG` 等产物的资源目录
  * njs 仍可通过 `__dirname` 或配置路径访问

* 映射表：

  - 在启动时njs进程发送一张链接映射表到rust进程
  - 如果映射表命中请求，则直接解析为映射表的值
  - 如果映射表未命中请求，则请求njs进程就行解析
  - njs进程在插件热拔插等更新映射表时发送新的映射表

---

### 3. 打包器

* 使用 `@tauri-apps/cli build` 与 `@tauri-apps/cli dev`

* 打包时：

  * 渲染器（React）由 webpack 打包输出
  * 主进程 njs 打包为 Sidecar，使用`pkg`
  * `tauri.conf.json` 配置：

    ```json
    {
      "tauri": {
        "bundle": {
          "sidecar": [
            "../dist/njs.exe"
          ]
        }
      }
    }
    ```

* 需要排除的依赖：
  * 所有 `@tauri-apps/api`