# 指导

本指导用于快速解释项目流程。

本Tauri插件仅作为NarraLeaf的Rust运行时帮助，用于运行用户服务和与渲染器通讯。

Tauri进程只应该处理和Tauri API相关的内容，并且负责渲染器行为的导航。

## 1. 启动

在用户将该插件应用于Tauri后，开始以下内容：
- 生成随机的socket连接字符串，启动IPC服务器
- 拉起Sidecar进程，在启动参数中加入socket连接字符串
- 等待Sidecar进程发出初始响应，报告其基础信息：使用的语言、运行的NarraLeaf兼容版本、使用的IPC内部协议版本

## 2. 转发

将`request_ipc`函数注入渲染器世界，其作用是invoke指令。

如果指令以命名空间`narraleaf:`开头，则直接将其转发给Sidecar进程。如果不是，返回错误信息。  

Sidecar进程响应后，将响应转发给渲染器世界。

## 3. 资源获取

当渲染器尝试访问`app://`开头的路径时，将路径转发给Sidecar进程。

Sidecar进程有义务对路径进行解析，并且返回一个`tauri://`或网络协议开头的路径。

如果Sidecar进程解析的路径符合Tauri的资源协议，则返回该资源。否则尝试从网络获取资源。

## 4. Tauri请求

仅Sidecar进程有权向运行时发送以`tauri:`命名空间开头的请求。这些请求是约定好的Tauri API，用于进行窗口管理、IPC状态管理等。

文件系统等内容由Sidecar进程自行处理。Tauri请求只应该包含和Tauri API相关的内容。

## 5. 生命周期

Sidecar进程的生命周期与Tauri进程的生命周期相同。

任何一方的终止和连接断开都会导致各方销毁本身所管理的资源并且退出。

Tauri进程通过监听连接状态和收听30秒一次的心跳包来确定Sidecar进程是否存活。如果监听超时，则退出。  
Sidecar进程应该每30秒向Tauri进程发送一次`tauri:ping`请求。

## 预期行为

对于Sidecar进程，所使用的语言可以是任何语言，但是至少要能使用Socket进行通讯。

与其来讲，Sidecar进程在Socket通讯中至少能：
- 接收`narraleaf:`命名空间开头的请求，并且返回应用所预期的响应
- 接收类型为`resolve_app_resource`的请求，并且返回解析的`tauri://`或网络协议开头的路径
- 向Tauri进程发送`tauri:`命名空间开头的请求以调用Tauri API
- 每30秒向Tauri进程发送一次`tauri:ping`请求
