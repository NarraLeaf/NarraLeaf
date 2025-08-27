/**
 * 窗口配置类型定义的编译时验证
 *
 * 本文件用于验证TypeScript类型定义的正确性，
 * 如果有类型错误，编译时会报错。
 */

// 导入所有需要验证的类型
import {
    WindowCreatePayload,
    WindowMaximizePayload,
    WindowMinimizePayload,
    WindowClosePayload,
    OperationResult,
    WindowOperationPayload,
    WindowOperationType,
    WindowOperationRequest,
    WindowCreateOptions,
    WindowState,
    WindowInfo,
    WindowEventType,
    WindowEventData,
    WindowManager,
} from './window.types';

/**
 * 验证WindowCreatePayload类型
 */
const validateWindowCreatePayload = () => {
    // 基本配置应该通过
    const basic: WindowCreatePayload = {
        label: 'test-window',
        title: 'Test Window',
        width: 800,
        height: 600,
    };

    // 完整配置应该通过
    const full: WindowCreatePayload = {
        label: 'full-window',
        title: 'Full Window',
        width: 1200,
        height: 800,
        x: 100,
        y: 100,
        center: true,
        decorations: true,
        alwaysOnTop: false,
        skipTaskbar: false,
    };

    // 缺少必需字段应该报错（注释掉以避免编译错误）
    // const invalid: WindowCreatePayload = {
    //     title: 'Invalid Window',
    //     width: 800,
    // }; // 缺少 label 和 height

    return { basic, full };
};

/**
 * 验证窗口操作配置类型
 */
const validateWindowOperationPayloads = () => {
    const maximize: WindowMaximizePayload = {
        windowLabel: 'test-window',
    };

    const minimize: WindowMinimizePayload = {
        windowLabel: undefined,
    };

    const close: WindowClosePayload = {};

    return { maximize, minimize, close };
};

/**
 * 验证OperationResult类型
 */
const validateOperationResult = () => {
    const successResult: OperationResult<string> = {
        success: true,
        message: 'Operation successful',
        data: 'result-data',
    };

    const failureResult: OperationResult = {
        success: false,
        message: 'Operation failed',
    };

    const emptyResult: OperationResult = {
        success: true,
    };

    return { successResult, failureResult, emptyResult };
};

/**
 * 验证WindowOperationPayload联合类型
 */
const validateWindowOperationPayloadUnion = () => {
    const createPayload: WindowOperationPayload = {
        label: 'test',
        title: 'Test',
        width: 800,
        height: 600,
    };

    const maximizePayload: WindowOperationPayload = {
        windowLabel: 'test',
    };

    return { createPayload, maximizePayload };
};

/**
 * 验证WindowOperationType枚举
 */
const validateWindowOperationType = () => {
    const create: WindowOperationType = WindowOperationType.CREATE;
    const maximize: WindowOperationType = WindowOperationType.MAXIMIZE;
    const minimize: WindowOperationType = WindowOperationType.MINIMIZE;
    const close: WindowOperationType = WindowOperationType.CLOSE;

    return { create, maximize, minimize, close };
};

/**
 * 验证WindowOperationRequest类型
 */
const validateWindowOperationRequest = () => {
    const request: WindowOperationRequest = {
        type: WindowOperationType.CREATE,
        payload: {
            label: 'test-window',
            title: 'Test Window',
            width: 800,
            height: 600,
        },
        id: 'req-001',
    };

    return request;
};

/**
 * 验证WindowCreateOptions类型
 */
const validateWindowCreateOptions = () => {
    const options: WindowCreateOptions = {
        label: 'advanced-window',
        title: 'Advanced Window',
        width: 1024,
        height: 768,
        center: true,
        decorations: true,
        resizable: true,
        minimizable: true,
        maximizable: true,
        closable: true,
        transparency: 0.9,
        backgroundColor: '#ffffff',
    };

    return options;
};

/**
 * 验证WindowState枚举
 */
const validateWindowState = () => {
    const normal: WindowState = WindowState.NORMAL;
    const maximized: WindowState = WindowState.MAXIMIZED;
    const minimized: WindowState = WindowState.MINIMIZED;
    const fullscreen: WindowState = WindowState.FULLSCREEN;
    const hidden: WindowState = WindowState.HIDDEN;

    return { normal, maximized, minimized, fullscreen, hidden };
};

/**
 * 验证WindowInfo类型
 */
const validateWindowInfo = () => {
    const info: WindowInfo = {
        label: 'test-window',
        title: 'Test Window',
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        state: WindowState.NORMAL,
        visible: true,
        focused: true,
    };

    return info;
};

/**
 * 验证WindowEventType枚举
 */
const validateWindowEventType = () => {
    const closeRequested: WindowEventType = WindowEventType.CLOSE_REQUESTED;
    const focus: WindowEventType = WindowEventType.FOCUS;
    const maximize: WindowEventType = WindowEventType.MAXIMIZE;

    return { closeRequested, focus, maximize };
};

/**
 * 验证WindowEventData类型
 */
const validateWindowEventData = () => {
    const eventData: WindowEventData = {
        type: WindowEventType.CLOSE_REQUESTED,
        windowLabel: 'test-window',
        data: { reason: 'user-requested' },
    };

    return eventData;
};

/**
 * 验证WindowManager接口
 */
const validateWindowManager = () => {
    // 创建一个实现了WindowManager接口的对象
    const windowManager: WindowManager = {
        createWindow: async (config: WindowCreatePayload): Promise<OperationResult<string>> => {
            return {
                success: true,
                message: `Window ${config.label} created`,
                data: config.label,
            };
        },

        closeWindow: async (config: WindowClosePayload): Promise<OperationResult> => {
            return {
                success: true,
                message: 'Window closed',
            };
        },

        maximizeWindow: async (config: WindowMaximizePayload): Promise<OperationResult> => {
            return {
                success: true,
                message: 'Window maximized',
            };
        },

        minimizeWindow: async (config: WindowMinimizePayload): Promise<OperationResult> => {
            return {
                success: true,
                message: 'Window minimized',
            };
        },

        getWindowInfo: async (windowLabel?: string): Promise<OperationResult<WindowInfo>> => {
            return {
                success: true,
                message: 'Window info retrieved',
                data: {
                    label: windowLabel || 'main',
                    title: 'Test Window',
                    width: 800,
                    height: 600,
                    x: 0,
                    y: 0,
                    state: WindowState.NORMAL,
                    visible: true,
                    focused: true,
                },
            };
        },

        getAllWindowsInfo: async (): Promise<OperationResult<WindowInfo[]>> => {
            return {
                success: true,
                message: 'All windows info retrieved',
                data: [],
            };
        },
    };

    return windowManager;
};

/**
 * 运行所有验证函数
 * 如果编译通过，说明所有类型定义都是正确的
 */
export const validateAllTypes = () => {
    const results = {
        windowCreatePayload: validateWindowCreatePayload(),
        windowOperationPayloads: validateWindowOperationPayloads(),
        operationResult: validateOperationResult(),
        windowOperationPayloadUnion: validateWindowOperationPayloadUnion(),
        windowOperationType: validateWindowOperationType(),
        windowOperationRequest: validateWindowOperationRequest(),
        windowCreateOptions: validateWindowCreateOptions(),
        windowState: validateWindowState(),
        windowInfo: validateWindowInfo(),
        windowEventType: validateWindowEventType(),
        windowEventData: validateWindowEventData(),
        windowManager: validateWindowManager(),
    };

    return results;
};

// 在模块加载时运行验证
if (process.env.NODE_ENV === 'development') {
    validateAllTypes();
}
