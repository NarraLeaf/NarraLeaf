/**
 * NarraLeaf 窗口管理模块
 *
 * 导出窗口相关的类型定义、接口、使用示例和测试
 */

// 导出所有窗口类型定义
export * from './window.types';

// 导出使用示例（仅在开发环境下）
if (process.env.NODE_ENV === 'development') {
    export * from './window.examples';
    export * from './window.test';
}
