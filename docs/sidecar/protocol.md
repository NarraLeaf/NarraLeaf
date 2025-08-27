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

Sidecar可以从渲染器中获取该请求，然后转发至Sidecar进程。

该命名空间下的请求类型包含：  
- `narraleaf:game.save.list` -> `data: SavedGameData[]`
- `narraleaf:game.save.read` -> `data: SavedGameData`
  - `id: string`
- `narraleaf:game.save.write` -> `void`
  - `id: string`
  - `data: SavedGameData`
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
- `tauri:window.create` -> `void`
  - `config: WindowCreatePayload`
- `tauri:window.maximize` -> `void`
  - `config: WindowMaximizePayload`
- `tauri:window.minimize` -> `void`
  - `config: WindowMinimizePayload`
- `tauri:window.close` -> `void`
  - `config: WindowClosePayload`
- `tauri:app.quit` -> `void`
  - `reason?: Error | null` 用于指定退出原因
- `tauri:ping` -> `timestamp: number`
