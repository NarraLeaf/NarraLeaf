# IPC 连通性测试说明

## 概述

这个测试用于验证 TypeScript 端和 Rust 端之间的 IPC 通信是否正常工作。

## 文件说明

- `src-rust/src/main.rs` - Rust IPC 服务器主程序
- `test-ipc.js` - JavaScript 测试客户端
- `build-rust.bat` - Windows 批处理构建脚本
- `build-rust.ps1` - PowerShell 构建脚本

## 测试步骤

### 1. 构建 Rust 项目

#### Windows 用户
```bash
# 使用批处理文件
build-rust.bat

# 或使用 PowerShell
.\build-rust.ps1

# 或手动构建
cd src-rust
cargo build --release
```

#### Linux/macOS 用户
```bash
cd src-rust
cargo build --release
```

### 2. 启动 Rust IPC 服务器

构建成功后，运行服务器：

```bash
# Windows
src-rust\target\release\narraleaf-host.exe

# Linux/macOS
src-rust/target/release/narraleaf-host
```

服务器启动后会显示：
```
Starting NarraLeaf IPC Test Server...
Protocol Version: 1
IPC Server started successfully
Server is running. Press Ctrl+C to stop.
```

### 3. 运行 JavaScript 测试

在另一个终端窗口中运行测试：

```bash
node test-ipc.js
```

## 预期结果

### 成功情况

如果一切正常，你应该看到：

**Rust 服务器端：**
```
New client connected: [client-id]
Received message from client [client-id]: Ping { timestamp: ... }
Received message from client [client-id]: VersionCheck { version: 1 }
Received message from client [client-id]: Request { ... }
```

**JavaScript 客户端：**
```
[INFO] Starting IPC connectivity test...
[INFO] Attempting to connect...
[INFO] Connected to: \\.\pipe\narraleaf-ipc (Windows) 或 /tmp/narraleaf-ipc.sock (Unix)
[INFO] ✅ Connected to Rust server
[INFO] Sending ping...
[INFO] Sending version check...
[INFO] Sending test request...
[INFO] 📨 Message received: { "type": "Pong", "timestamp": ... }
[INFO] 📨 Message received: { "type": "VersionResponse", "version": 1, "compatible": true }
[INFO] 📨 Message received: { "type": "Response", ... }
```

### 失败情况

如果连接失败，可能的原因：

1. **Rust 服务器未运行**
   - 确保先启动 Rust 服务器
   - 检查服务器是否在正确的端口/管道上监听

2. **权限问题**
   - Windows: 检查命名管道权限
   - Unix: 检查 socket 文件权限

3. **协议不匹配**
   - 检查消息格式是否正确
   - 确认版本号是否匹配

## 故障排除

### 常见问题

1. **"Connection refused" 错误**
   - 确保 Rust 服务器正在运行
   - 检查连接字符串是否正确

2. **"Invalid message length" 错误**
   - 检查消息传输协议是否匹配
   - 确认长度前缀格式正确

3. **JSON 解析错误**
   - 检查消息内容格式
   - 确认字符编码正确

### 调试模式

启用详细日志：

```javascript
// 在 test-ipc.js 中修改日志级别
logger.debug = logger.info; // 显示所有调试信息
```

## 测试覆盖

这个测试验证了：

- ✅ 基本连接建立
- ✅ 消息传输协议
- ✅ Ping/Pong 心跳机制
- ✅ 版本兼容性检查
- ✅ 请求/响应机制
- ✅ 消息类型处理
- ✅ 错误处理

## 下一步

测试成功后，你可以：

1. 集成到实际的 TypeScript 项目中
2. 添加更多自定义消息类型
3. 实现更复杂的业务逻辑
4. 添加性能测试和压力测试

## 注意事项

- 测试完成后记得停止 Rust 服务器（Ctrl+C）
- 在 Windows 上，命名管道可能需要管理员权限
- 确保防火墙不会阻止本地连接

