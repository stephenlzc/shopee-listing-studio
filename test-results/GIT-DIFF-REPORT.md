# Git Diff 分析报告 — AI-PM-Designer-Pro → Shopee Listing Studio

**分析日期**: 2026-05-11  
**对比范围**: `3a1906f` (原始 Gemini 项目首次完整提交) → `79a00ec` (当前 HEAD)  
**跨越提交数**: 91 commits  

---

## 总体摘要

| 指标 | 数值 |
|------|------|
| 总文件变更 | **70 个文件** |
| 新增代码 | **+11,946 行** |
| 删除代码 | **−1,031 行** |
| 净增长 | **+10,915 行** |
| 原项目保留比例 | **~6%** (仅保留 UI 骨架) |

---

## 按文件类型分布

| 类型 | 文件数 | 新增 | 删除 | 说明 |
|------|--------|------|------|------|
| TypeScript/TSX | 43 | +6,337 | −930 | 核心逻辑重写 |
| Markdown | 15 | +2,791 | −63 | 文档、规范、测试报告 |
| JSON/Config | 5 | +2,728 | −9 | 依赖锁文件 |
| CSS/HTML | 2 | +23 | −29 | 样式迁移至 Tailwind |
| 其他 | 5 | +67 | −0 | 元数据、测试数据 |

---

## 原项目核心文件（已删除）

以下 4 个文件是原 Gemini 项目的核心，**已完全删除并替换**：

| 文件 | 原用途 | 替换方案 |
|------|--------|----------|
| `services/geminiService.ts` | Google Gemini API 调用 | → `services/imageGenService.ts` + `listingService.ts` + `visionService.ts` |
| `components/ContentSuite.tsx` | 广告素材套件 UI | → `components/ShopeeImageGrid.tsx` |
| `components/PromptCard.tsx` | 广告 Prompt 卡片 | → 内嵌到 Phase 2 组件中 |
| `types.ts` | Gemini 时代类型 | → `types/shopee.ts` (313 行，30+ 型别) |

---

## 新增核心架构（56 个新文件）

### 服务层 (`services/`) — 全新
| 文件 | 行数 | 职责 |
|------|------|------|
| `imageGenService.ts` | 429 | GPT-Image-2 异步图片生成（提交 + 轮询） |
| `listingService.ts` | 315 | SEO 标题、描述、合規检查 |
| `visionService.ts` | 171 | GPT-5.5 Vision 文字识别 |
| `storageService.ts` | 145 | IndexedDB 持久化 |
| `baseImageService.ts` | 137 | 产品底图生成 |

### 型别系统 (`types/`)
| 文件 | 行数 | 职责 |
|------|------|------|
| `shopee.ts` | 313 | 30+ 型别：`ShopeeProject`, `SeoTitle`, `SkuBundle`, `ComplianceItem`, 20 种视觉风格等 |

### Prompt 模板 (`prompts/`) — 全新
| 文件 | 行数 | 职责 |
|------|------|------|
| `directorPrompt.ts` | 68 | 视觉策略总监 |
| `listingPrompt.ts` | 200 | Listing 生成 |
| `visionPrompt.ts` | 42 | 图片文字识别 |

### 工具层 (`utils/`) — 全新
| 文件 | 行数 | 职责 |
|------|------|------|
| `compliance.ts` | 150 | 50+ 禁用词过滤规则 |
| `errorHandler.ts` | 213 | 统一错误处理 |
| `constants.ts` | 91 | API 配置常量 |
| `imageColorExtractor.ts` | 243 | Canvas 色彩萃取 |
| `reportGenerator.ts` | 124 | Listing 报告生成 |
| `validators.ts` | 80 | 输入校验 |

### 组件层 (`components/`) — 全新
| 文件 | 行数 | 职责 |
|------|------|------|
| `ShopeeImageGrid.tsx` | 461 | 图片网格 + 批量生成 |
| `Phase2Section.tsx` | 378 | Listing 审阅 |
| `InputForm.tsx` | 362 | 产品输入表单 |
| `BlurTool.tsx` | 265 | Canvas 文字模糊遮蓋 |
| `ProjectHistory.tsx` | 223 | 项目历史侧边栏 |
| `TextDetectionPanel.tsx` | 210 | OCR 文字检测面板 |
| `ApiKeyModal.tsx` | 107 | API Key 管理 |

### 参考资料 (`references/`)
| 文件 | 行数 | 职责 |
|------|------|------|
| `taiwan-localization.md` | 58 | 台湾用语对照表 |
| `taiwan-genz-phrase-bank.md` | 60 | Gen Z 文案短语库 |
| `compliance.md` | 67 | 合規规则 |
| `image-specs.md` | 60 | 图片规格说明 |

---

## 重大修改文件

| 文件 | 变更 | 性质 |
|------|------|------|
| `App.tsx` | 314 → 671 行 (+357) | 从 4-Phase 重写为 3-Phase 状态机 |
| `prompts.ts` | 122 → 371 行 (+249) | 从 Gemini Prompt 迁移至 Shopee Listing Prompt |
| `README.md` | 完全重写 | Gemini v0.8 → Shopee Listing Studio v0.9 |
| `index.html` | CDN 引用 → PostCSS | 移除 Tailwind CDN，改用编译方案 |
| `vite.config.ts` | +35 行修改 | 新增端口固定、Tailwind 配置 |
| `package.json` | Gemini → APIMart | 依赖完全替换 |
| `components/GuideModal.tsx` | 重写 | v0.9 Shopee 版操作指南 |
| `components/ProductCard.tsx` | 修改 | 适配 Shopee 产品数据 |
| `index.tsx` | 修改 | 入口简化 |

---

## 架构对比

| 维度 | 原项目 (v0.8) | 现项目 (v0.9) |
|------|---------------|---------------|
| AI 模型 | Google Gemini 2.5 Flash | GPT-5.5 + GPT-Image-2 (via APIMart) |
| 工作流 | 4-Phase (分析→策略→市场→内容) | 3-Phase (分析→Listing→图片生产) |
| 图片生成 | 同步 Gemini 3 Pro Image | 异步提交 + 轮询模式 |
| 目标输出 | 广告海报 + 社群 Stories | 虾皮 Listing 主图/详情图/SEO/合規 |
| 语言 | 中英双语 | 台湾繁体中文 + 在地化 |
| 持久化 | localStorage (5MB 限制) | IndexedDB + localStorage 分层次 |
| API Key 管理 | 硬编码 + localStorage | 环境变量 (.env) |
| 主题 | 无 | 日夜主题切换 |
| 合规 | 无 | 50+ 禁用词自动过滤 |
| 图片处理 | 无 | Canvas 文字检测 + 区域模糊 |

---

## 保留内容

从原项目保留的部分非常有限，仅包括：

1. **UI 骨架**: `LoadingOverlay`, `Spinner`, `ImageModal` 等通用 UI 组件
2. **文件命名**: `GuideModal`, `ProductCard` 等组件名保留，但内部完全重写
3. **项目配置骨架**: Vite + React + TypeScript 技术栈组合
4. **MIT License**: 开源协议继承

**结论**: 本项目是对原 AI-PM-Designer-Pro 的**大规模重写**（~94% 代码为新增或重写），而非小修小补。原项目仅保留了最基本的 UI 骨架和技术栈方向，核心业务逻辑、AI 模型、工作流程、目标输出均已完全不同。
