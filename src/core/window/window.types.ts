/**
 * NarraLeaf Tauri窗口配置类型定义
 *
 * 本文件定义了与Tauri窗口操作相关的TypeScript类型约定，
 * 对应Rust端的tauri_handlers.rs中的结构定义。
 */

/**
 * Tauri窗口创建配置
 * 对应Rust端的WindowCreatePayload结构
 */
export interface WindowCreatePayload {
    /** 窗口标签，用于唯一标识窗口 */
    label: string;
    /** 窗口标题 */
    title: string;
    /** 窗口宽度（像素） */
    width: number;
    /** 窗口高度（像素） */
    height: number;
    /** 窗口X坐标位置，可选，为空时使用系统默认 */
    x?: number;
    /** 窗口Y坐标位置，可选，为空时使用系统默认 */
    y?: number;
    /** 是否居中窗口，可选，默认为false */
    center?: boolean;
    /** 是否显示窗口边框，可选，默认为true */
    decorations?: boolean;
    /** 是否始终在最顶层，可选，默认为false */
    alwaysOnTop?: boolean;
    /** 是否跳过任务栏，可选，默认为false */
    skipTaskbar?: boolean;
}

/**
 * Tauri窗口最大化配置
 * 对应Rust端的WindowMaximizePayload结构
 */
export interface WindowMaximizePayload {
    /** 目标窗口标签，可选，为空时操作主窗口 */
    windowLabel?: string;
}

/**
 * Tauri窗口最小化配置
 * 对应Rust端的WindowMinimizePayload结构
 */
export interface WindowMinimizePayload {
    /** 目标窗口标签，可选，为空时操作主窗口 */
    windowLabel?: string;
}

/**
 * Tauri窗口关闭配置
 * 对应Rust端的WindowClosePayload结构
 */
export interface WindowClosePayload {
    /** 目标窗口标签，可选，为空时操作主窗口 */
    windowLabel?: string;
}

/**
 * 操作结果类型
 * 对应Rust端的OperationResult结构
 */
export interface OperationResult<T = any> {
    /** 操作是否成功 */
    success: boolean;
    /** 操作结果消息 */
    message?: string;
    /** 操作返回的数据 */
    data?: T;
}

/**
 * Tauri窗口配置联合类型
 * 包含所有窗口操作的配置类型
 */
export type WindowOperationPayload =
    | WindowCreatePayload
    | WindowMaximizePayload
    | WindowMinimizePayload
    | WindowClosePayload;

/**
 * Tauri窗口操作类型枚举
 * 对应Rust端execute_tauri_operation函数中处理的请求类型
 */
export enum WindowOperationType {
    /** 创建窗口 */
    CREATE = 'tauri:window.create',
    /** 最大化窗口 */
    MAXIMIZE = 'tauri:window.maximize',
    /** 最小化窗口 */
    MINIMIZE = 'tauri:window.minimize',
    /** 关闭窗口 */
    CLOSE = 'tauri:window.close',
}

/**
 * 窗口操作请求类型
 * 用于向Tauri后端发送窗口操作请求
 */
export interface WindowOperationRequest {
    /** 操作类型 */
    type: WindowOperationType;
    /** 操作配置 */
    payload: WindowOperationPayload;
    /** 请求ID，用于跟踪请求 */
    id: string;
}

/**
 * 窗口操作响应类型
 * Tauri后端返回的操作结果
 */
export interface WindowOperationResponse {
    /** 请求ID */
    id: string;
    /** 操作结果 */
    result: OperationResult;
}

/**
 * 窗口状态枚举
 */
export enum WindowState {
    /** 正常状态 */
    NORMAL = 'normal',
    /** 最大化 */
    MAXIMIZED = 'maximized',
    /** 最小化 */
    MINIMIZED = 'minimized',
    /** 全屏 */
    FULLSCREEN = 'fullscreen',
    /** 隐藏 */
    HIDDEN = 'hidden',
}

/**
 * 窗口信息类型
 * 用于获取窗口的当前状态信息
 */
export interface WindowInfo {
    /** 窗口标签 */
    label: string;
    /** 窗口标题 */
    title: string;
    /** 窗口宽度 */
    width: number;
    /** 窗口高度 */
    height: number;
    /** 窗口X坐标 */
    x: number;
    /** 窗口Y坐标 */
    y: number;
    /** 窗口状态 */
    state: WindowState;
    /** 是否可见 */
    visible: boolean;
    /** 是否聚焦 */
    focused: boolean;
}

/**
 * 窗口创建选项扩展配置
 * 提供更丰富的窗口创建选项
 */
export interface WindowCreateOptions extends WindowCreatePayload {
    /** 窗口图标路径，可选 */
    icon?: string;
    /** 是否可调整大小，默认为true */
    resizable?: boolean;
    /** 是否可最小化，默认为true */
    minimizable?: boolean;
    /** 是否可最大化，默认为true */
    maximizable?: boolean;
    /** 是否可关闭，默认为true */
    closable?: boolean;
    /** 窗口透明度，范围0.0-1.0，默认为1.0 */
    transparency?: number;
    /** 窗口背景色，十六进制格式，可选 */
    backgroundColor?: string;
    /** 是否显示在所有工作区，默认为false */
    visibleOnAllWorkspaces?: boolean;
}

/**
 * 窗口事件类型枚举
 */
export enum WindowEventType {
    /** 窗口关闭事件 */
    CLOSE_REQUESTED = 'close_requested',
    /** 窗口聚焦事件 */
    FOCUS = 'focus',
    /** 窗口失焦事件 */
    BLUR = 'blur',
    /** 窗口显示事件 */
    SHOW = 'show',
    /** 窗口隐藏事件 */
    HIDE = 'hide',
    /** 窗口移动事件 */
    MOVE = 'move',
    /** 窗口大小改变事件 */
    RESIZE = 'resize',
    /** 窗口最大化事件 */
    MAXIMIZE = 'maximize',
    /** 窗口最小化事件 */
    MINIMIZE = 'minimize',
    /** 窗口恢复事件 */
    RESTORE = 'restore',
}

/**
 * 窗口事件数据类型
 */
export interface WindowEventData {
    /** 事件类型 */
    type: WindowEventType;
    /** 窗口标签 */
    windowLabel: string;
    /** 事件相关数据 */
    data?: any;
}

/**
 * 窗口管理器接口
 * 定义窗口管理器的标准接口
 */
export interface WindowManager {
    /** 创建窗口 */
    createWindow(config: WindowCreatePayload): Promise<OperationResult<string>>;
    /** 关闭窗口 */
    closeWindow(config: WindowClosePayload): Promise<OperationResult>;
    /** 最大化窗口 */
    maximizeWindow(config: WindowMaximizePayload): Promise<OperationResult>;
    /** 最小化窗口 */
    minimizeWindow(config: WindowMinimizePayload): Promise<OperationResult>;
    /** 获取窗口信息 */
    getWindowInfo(windowLabel?: string): Promise<OperationResult<WindowInfo>>;
    /** 获取所有窗口信息 */
    getAllWindowsInfo(): Promise<OperationResult<WindowInfo[]>>;
}
