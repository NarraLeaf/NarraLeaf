/**
 * NarraLeaf 窗口配置类型使用示例
 *
 * 本文件展示了如何使用窗口配置类型定义的示例代码
 */

import {
    WindowCreatePayload,
    WindowMaximizePayload,
    WindowMinimizePayload,
    WindowClosePayload,
    WindowOperationType,
    WindowOperationRequest,
    WindowCreateOptions,
    WindowEventType,
    OperationResult,
} from './window.types';

/**
 * 窗口创建配置示例
 */
export const windowCreateExamples = {
    // 基本窗口创建配置
    basicWindow: {
        label: 'main-window',
        title: 'NarraLeaf 主窗口',
        width: 1200,
        height: 800,
    } as WindowCreatePayload,

    // 带位置和样式的窗口配置
    styledWindow: {
        label: 'game-window',
        title: '游戏窗口',
        width: 1024,
        height: 768,
        x: 100,
        y: 100,
        center: false,
        decorations: true,
        alwaysOnTop: false,
        skipTaskbar: false,
    } as WindowCreatePayload,

    // 扩展配置示例
    extendedWindow: {
        label: 'dialog-window',
        title: '对话框窗口',
        width: 600,
        height: 400,
        center: true,
        decorations: false,
        alwaysOnTop: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        transparency: 0.9,
        backgroundColor: '#ffffff',
    } as WindowCreateOptions,
};

/**
 * 窗口操作配置示例
 */
export const windowOperationExamples = {
    // 最大化主窗口
    maximizeMain: {
        windowLabel: undefined, // 操作主窗口
    } as WindowMaximizePayload,

    // 最大化指定窗口
    maximizeSpecific: {
        windowLabel: 'game-window',
    } as WindowMaximizePayload,

    // 最小化窗口
    minimizeWindow: {
        windowLabel: 'dialog-window',
    } as WindowMinimizePayload,

    // 关闭窗口
    closeWindow: {
        windowLabel: 'temp-window',
    } as WindowClosePayload,
};

/**
 * 窗口操作请求示例
 */
export const windowRequestExamples = {
    // 创建窗口请求
    createWindowRequest: {
        type: WindowOperationType.CREATE,
        payload: windowCreateExamples.basicWindow,
        id: 'req-001',
    } as WindowOperationRequest,

    // 最大化窗口请求
    maximizeWindowRequest: {
        type: WindowOperationType.MAXIMIZE,
        payload: windowOperationExamples.maximizeMain,
        id: 'req-002',
    } as WindowOperationRequest,

    // 关闭窗口请求
    closeWindowRequest: {
        type: WindowOperationType.CLOSE,
        payload: windowOperationExamples.closeWindow,
        id: 'req-003',
    } as WindowOperationRequest,
};

/**
 * 操作结果示例
 */
export const operationResultExamples = {
    // 成功的操作结果
    successResult: {
        success: true,
        message: 'Window created successfully',
        data: 'main-window',
    } as OperationResult<string>,

    // 失败的操作结果
    failureResult: {
        success: false,
        message: 'Failed to create window: invalid configuration',
        data: null,
    } as OperationResult,

    // 带数据的成功结果
    dataResult: {
        success: true,
        message: 'Window info retrieved',
        data: {
            label: 'main-window',
            title: 'NarraLeaf 主窗口',
            width: 1200,
            height: 800,
            x: 0,
            y: 0,
            state: 'normal',
            visible: true,
            focused: true,
        },
    } as OperationResult,
};

/**
 * 类型使用示例函数
 */
export class WindowManagerExample {
    /**
     * 创建窗口的示例函数
     */
    static async createWindow(config: WindowCreatePayload): Promise<OperationResult<string>> {
        // 这里是实际的窗口创建逻辑
        console.log('Creating window with config:', config);

        // 模拟成功结果
        return {
            success: true,
            message: `Window '${config.label}' created successfully`,
            data: config.label,
        };
    }

    /**
     * 发送窗口操作请求的示例函数
     */
    static async sendWindowRequest(request: WindowOperationRequest): Promise<OperationResult> {
        console.log('Sending window request:', request);

        // 根据请求类型处理
        switch (request.type) {
            case WindowOperationType.CREATE:
                return this.createWindow(request.payload as WindowCreatePayload);
            case WindowOperationType.MAXIMIZE:
                return this.maximizeWindow(request.payload as WindowMaximizePayload);
            case WindowOperationType.MINIMIZE:
                return this.minimizeWindow(request.payload as WindowMinimizePayload);
            case WindowOperationType.CLOSE:
                return this.closeWindow(request.payload as WindowClosePayload);
            default:
                return {
                    success: false,
                    message: `Unknown operation type: ${request.type}`,
                };
        }
    }

    /**
     * 最大化窗口
     */
    static async maximizeWindow(config: WindowMaximizePayload): Promise<OperationResult> {
        const target = config.windowLabel || 'main';
        console.log(`Maximizing window: ${target}`);

        return {
            success: true,
            message: `Window '${target}' maximized successfully`,
        };
    }

    /**
     * 最小化窗口
     */
    static async minimizeWindow(config: WindowMinimizePayload): Promise<OperationResult> {
        const target = config.windowLabel || 'main';
        console.log(`Minimizing window: ${target}`);

        return {
            success: true,
            message: `Window '${target}' minimized successfully`,
        };
    }

    /**
     * 关闭窗口
     */
    static async closeWindow(config: WindowClosePayload): Promise<OperationResult> {
        const target = config.windowLabel || 'main';
        console.log(`Closing window: ${target}`);

        return {
            success: true,
            message: `Window '${target}' closed successfully`,
        };
    }
}

/**
 * 事件处理示例
 */
export const eventHandlingExample = {
    /**
     * 处理窗口事件的示例函数
     */
    handleWindowEvent: (eventType: WindowEventType, windowLabel: string, data?: any) => {
        switch (eventType) {
            case WindowEventType.CLOSE_REQUESTED:
                console.log(`Window '${windowLabel}' close requested`);
                // 处理窗口关闭请求
                break;
            case WindowEventType.FOCUS:
                console.log(`Window '${windowLabel}' gained focus`);
                // 处理窗口聚焦
                break;
            case WindowEventType.MAXIMIZE:
                console.log(`Window '${windowLabel}' was maximized`);
                // 处理窗口最大化
                break;
            default:
                console.log(`Window event: ${eventType} for ${windowLabel}`, data);
        }
    },
};
