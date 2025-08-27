import {BaseProjectConfig} from "@core/project/projectConfig/baseProject";

import {DeepPartial} from "@/utils/types";

type ProjectConfig = DeepPartial<BaseProjectConfig>;

export {ProjectConfig};

// 导出窗口相关类型定义
export * from './window';