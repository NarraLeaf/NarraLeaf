# Sidecar Protocol (Draft)

Sidecar协议用于规定NarraLeaf Rust Runtime如何与Sidecar进程通讯。

Socket每次发送的数据结构为:  
```rust
struct SidecarMessage {
    id: String,
    request_type: String,
    payload: Value,
}
```

其中，`id`用于标识该请求，`request_type`用于标识该请求的类型，`payload`用于携带请求的参数。

Request Type应该以命名空间开头，使用`:`分隔。

## narraleaf

任何以`narraleaf:`命名空间开头的请求由Sidecar进程处理。

Rust Runtime可以从渲染器中获取该请求，然后转发至Sidecar进程。

该命名空间下的请求类型包含：  
- `narraleaf:game.save.list` -> `data: SavedGameMeta[]`
- `narraleaf:game.save.read` -> `data: SavedGame`
  - `id: string`
- `narraleaf:game.save.write` -> `void`
  - `id: string`
  - `data: SavedGame`
- `narraleaf:game.save.delete` -> `void`
  - `id: string`
- `narraleaf:app.quit` -> `void`
  - `reason?: Error | null` 用于指定退出原因
- `narraleaf:app.reload` -> `void`
- `narraleaf:app.request` -> `any`
  - `payload: any`

## tauri

任何以`tauri:`命名空间开头的请求由Tauri进程处理。该命名空间的请求仅能由Sidecar进程发送。

该命名空间的请求类型包含：

### 窗口管理 (Window Management)
- `tauri:window.create` -> `void`
  - `config: WindowCreatePayload`
- `tauri:window.maximize` -> `void`
  - `config: WindowMaximizePayload`
- `tauri:window.minimize` -> `void`
  - `config: WindowMinimizePayload`
- `tauri:window.close` -> `void`
  - `config: WindowClosePayload`
- `tauri:window.show` -> `void`
  - `config: WindowShowPayload`
- `tauri:window.hide` -> `void`
  - `config: WindowHidePayload`
- `tauri:window.set_focus` -> `void`
  - `config: WindowFocusPayload`
- `tauri:window.set_position` -> `void`
  - `config: WindowPositionPayload`
- `tauri:window.set_size` -> `void`
  - `config: WindowSizePayload`
- `tauri:window.set_title` -> `void`
  - `config: WindowTitlePayload`
- `tauri:window.center` -> `void`
  - `config: WindowCenterPayload`
- `tauri:window.set_decorations` -> `void`
  - `config: WindowDecorationsPayload`

### 对话框 (Dialog)
- `tauri:dialog.open` -> `path: string | null`
  - `options?: OpenDialogOptions`
- `tauri:dialog.save` -> `path: string | null`
  - `options?: SaveDialogOptions`
- `tauri:dialog.message` -> `void`
  - `message: string`
  - `options?: MessageDialogOptions`
- `tauri:dialog.ask` -> `confirmed: boolean`
  - `message: string`
  - `options?: ConfirmDialogOptions`

### 剪贴板 (Clipboard)
- `tauri:clipboard.write_text` -> `void`
  - `text: string`
- `tauri:clipboard.read_text` -> `text: string | null`



### 应用信息 (App)
- `tauri:app.get_version` -> `version: string`
- `tauri:app.get_name` -> `name: string`
- `tauri:app.get_tauri_version` -> `version: string`
- `tauri:app.show` -> `void`
- `tauri:app.hide` -> `void`
- `tauri:app.quit` -> `void`
  - `reason?: Error | null` 用于指定退出原因



### 其他
- `tauri:ping` -> `timestamp: number`
- `tauri:shell.open` -> `void`
  - `path: string`
  - `options?: OpenOptions`
