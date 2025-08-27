# NarraLeaf 窗口配置 TypeScript 类型约定

本模块定义了与 Tauri 窗口操作相关的 TypeScript 类型约定，对应 Rust 端的 `tauri_handlers.rs` 中的结构定义。

## 目录结构

```
src/core/window/
├── window.types.ts      # 核心类型定义
├── window.examples.ts   # 使用示例
├── index.ts            # 模块导出
└── README.md           # 文档说明
```

## 主要类型定义

### 窗口创建配置

```typescript
interface WindowCreatePayload {
    label: string;           // 窗口标签，用于唯一标识窗口
    title: string;           // 窗口标题
    width: number;           // 窗口宽度（像素）
    height: number;          // 窗口高度（像素）
    x?: number;              // 窗口X坐标位置，可选
    y?: number;              // 窗口Y坐标位置，可选
    center?: boolean;        // 是否居中窗口，可选
    decorations?: boolean;   // 是否显示窗口边框，可选
    alwaysOnTop?: boolean;   // 是否始终在最顶层，可选
    skipTaskbar?: boolean;   // 是否跳过任务栏，可选
}
```

### 窗口操作配置

```typescript
interface WindowMaximizePayload {
    windowLabel?: string;    // 目标窗口标签，可选，为空时操作主窗口
}

interface WindowMinimizePayload {
    windowLabel?: string;    // 目标窗口标签，可选，为空时操作主窗口
}

interface WindowClosePayload {
    windowLabel?: string;    // 目标窗口标签，可选，为空时操作主窗口
}
```

### 操作结果类型

```typescript
interface OperationResult<T = any> {
    success: boolean;        // 操作是否成功
    message?: string;        // 操作结果消息
    data?: T;               // 操作返回的数据
}
```

### 窗口操作类型枚举

```typescript
enum WindowOperationType {
    CREATE = 'tauri:window.create',
    MAXIMIZE = 'tauri:window.maximize',
    MINIMIZE = 'tauri:window.minimize',
    CLOSE = 'tauri:window.close',
}
```

## 使用示例

### 1. 创建窗口

```typescript
import { WindowCreatePayload, WindowOperationType, WindowOperationRequest } from '@core/window';

// 基本窗口配置
const windowConfig: WindowCreatePayload = {
    label: 'main-window',
    title: 'NarraLeaf 主窗口',
    width: 1200,
    height: 800,
    center: true,
    decorations: true,
};

// 创建窗口操作请求
const request: WindowOperationRequest = {
    type: WindowOperationType.CREATE,
    payload: windowConfig,
    id: 'req-001',
};
```

### 2. 窗口操作

```typescript
import { WindowMaximizePayload, WindowClosePayload } from '@core/window';

// 最大化窗口
const maximizeConfig: WindowMaximizePayload = {
    windowLabel: 'main-window', // 可选，为空时操作主窗口
};

// 关闭窗口
const closeConfig: WindowClosePayload = {
    windowLabel: 'dialog-window',
};
```

### 3. 处理操作结果

```typescript
import { OperationResult } from '@core/window';

function handleWindowOperation(result: OperationResult<string>) {
    if (result.success) {
        console.log(`操作成功: ${result.message}`);
        if (result.data) {
            console.log(`窗口标签: ${result.data}`);
        }
    } else {
        console.error(`操作失败: ${result.message}`);
    }
}
```

## 扩展配置

对于更复杂的窗口创建需求，可以使用 `WindowCreateOptions` 接口：

```typescript
import { WindowCreateOptions } from '@core/window';

const advancedConfig: WindowCreateOptions = {
    label: 'advanced-window',
    title: '高级窗口',
    width: 1024,
    height: 768,
    center: true,
    decorations: false,
    alwaysOnTop: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    transparency: 0.9,
    backgroundColor: '#ffffff',
    visibleOnAllWorkspaces: false,
};
```

## 窗口事件处理

```typescript
import { WindowEventType, WindowEventData } from '@core/window';

function handleWindowEvent(event: WindowEventData) {
    switch (event.type) {
        case WindowEventType.CLOSE_REQUESTED:
            console.log(`窗口 ${event.windowLabel} 请求关闭`);
            break;
        case WindowEventType.FOCUS:
            console.log(`窗口 ${event.windowLabel} 获得焦点`);
            break;
        case WindowEventType.MAXIMIZE:
            console.log(`窗口 ${event.windowLabel} 被最大化`);
            break;
        // 处理其他事件...
    }
}
```

## 与 Rust 端的对应关系

| TypeScript 类型 | Rust 结构体 | 说明 |
|----------------|------------|------|
| `WindowCreatePayload` | `WindowCreatePayload` | 窗口创建配置 |
| `WindowMaximizePayload` | `WindowMaximizePayload` | 窗口最大化配置 |
| `WindowMinimizePayload` | `WindowMinimizePayload` | 窗口最小化配置 |
| `WindowClosePayload` | `WindowClosePayload` | 窗口关闭配置 |
| `OperationResult<T>` | `OperationResult` | 操作结果类型 |

## 注意事项

1. 所有可选字段在 Rust 端都有默认值
2. 窗口标签 (`label`) 在整个应用程序中必须唯一
3. 坐标值 (`x`, `y`) 以像素为单位
4. 尺寸值 (`width`, `height`) 以像素为单位
5. 透明度范围为 0.0 到 1.0

## 导入方式

```typescript
// 导入所有类型
import * from '@core/window';

// 导入特定类型
import { WindowCreatePayload, OperationResult } from '@core/window';

// 开发环境下导入示例
import { windowCreateExamples } from '@core/window';
```
