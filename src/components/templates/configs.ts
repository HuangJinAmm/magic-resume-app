import { ResumeTemplate } from "@/types/template";

// 模板元数据（config）单独成模块，避免引用模板 UI 组件。
// DEFAULT_TEMPLATES 被 store / 列表页 / 选择器等大量模块引用，
// 若与组件放在同一模块会把全部模板组件打进首屏 chunk。
import { classicConfig } from "./classic/config";
import { modernConfig } from "./modern/config";
import { leftRightConfig } from "./left-right/config";
import { timelineConfig } from "./timeline/config";
import { minimalistConfig } from "./minimalist/config";
import { elegantConfig } from "./elegant/config";
import { creativeConfig } from "./creative/config";
import { editorialConfig } from "./editorial/config";
import { swissConfig } from "./swiss/config";

export const DEFAULT_TEMPLATES: ResumeTemplate[] = [
  classicConfig,
  modernConfig,
  leftRightConfig,
  timelineConfig,
  minimalistConfig,
  elegantConfig,
  creativeConfig,
  editorialConfig,
  swissConfig,
];
