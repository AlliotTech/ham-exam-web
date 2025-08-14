## 业余无线电执照考试模拟（2025 题库）

[![Node 20+](https://img.shields.io/badge/Node-%E2%89%A520.0-339933?logo=node.js)](https://nodejs.org)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)

基于官方最新题库构建的在线模拟与练习应用，支持 A / B / C 三类考试，提供真实规则抽题、计时交卷、练习搜索、答题卡与标记、PWA 安装等功能。

题库来源：`TimXiedada/crac-amateur-radio-exam-questions-2025-csv`（感谢上游维护者）。

## 目录

- [功能特色](#功能特色)
- [快速开始](#快速开始)
- [数据集构建questions-json-与题图](#数据集构建questions-json-与题图)
- [命令](#命令)
- [页面与路由](#页面与路由)
- [键盘快捷键](#键盘快捷键)
- [PWA 与图标](#pwa-与图标)
- [题目数据结构](#题目数据结构)
- [隐私说明](#隐私说明)
- [常见问题faq](#常见问题faq)
- [致谢](#致谢)

## 功能特色

- **模拟考试（A/B/C 类）**：按照真实考试规则随机抽题（单选/多选比例、总题数与限时），提供倒计时与自动交卷；交卷后显示分数、正确率与是否合格，并可继续浏览题目与标准答案。
- **练习模式（顺序/随机）**：支持顺序与随机两种题序；可切换“显示正确答案”；自动保存进度并在恰当时机提示“继续上次/重新开始”（可按题库选择不再提示）。
- **答题卡与标记**：侧边答题卡快速跳转题目，支持筛选“全部/未答/已标记”；可对题目打标以便回看。
- **搜索与跳转（练习顺序模式）**：输入题号 J 码（如 LK0501）或关键词实时匹配并跳转，带少量结果预览。
- **计时与成绩**：进度条与剩余时间提醒；成绩弹窗展示正确数/总题数、正确率与合格线；多选题需与标准答案完全一致才计分。
- **键盘快捷键**：←/→ 切换上一题/下一题；数字 1-9 直接选择单选项；Enter 打开搜索（练习顺序模式）。
- **移动优先 UI**：响应式布局与底部操作栏，移动端操作便捷；图片懒加载与轻量动效兼顾性能与体验。
- **PWA 支持**：提供 `manifest.json` 与自动生成图标，可添加到主屏幕，具备基础离线能力（依赖浏览器缓存）。
- **题库与资源管理**：构建时生成静态 JSON（`public/questions/`），前端直接加载；题目附图懒加载，减少网络与渲染开销。
- **隐私与本地存储**：使用浏览器 `localStorage` 保存练习记录与偏好设置，不上传个人数据，无第三方统计脚本。

## 快速开始

环境要求：Node.js 20+

```bash
pnpm i # 或 npm i / yarn
pnpm dev # 本地开发（默认启用 Turbopack）
```

打开浏览器访问 `http://localhost:3000`。

若首次运行看到题库为空或 404，请先执行“数据集构建”。

## 数据集构建（questions JSON 与题图）

本项目在构建阶段将 CSV 题库与图片转换为可直接由前端加载的静态资源：

- 题目 JSON 输出至：`public/questions/{A,B,C,full}.json`
- 附图输出至：`public/questions/images/*.jpg`

构建脚本：`scripts/build-dataset.mjs`

数据来源优先级：

1) 本地环境变量 `DATASET_DIR` 指向包含 `class_a.csv`、`class_b.csv`、`class_c.csv`、`full.csv`、`images.csv` 的目录
2) 若未设置则回退到远程原始数据（默认：`https://raw.githubusercontent.com/AlliotTech/crac-amateur-radio-exam-questions-2025-csv/main`）

macOS 示例：

```bash
export DATASET_DIR="/Users/<you>/Downloads/tmp/crac-amateur-radio-exam-questions-2025-csv"
```

执行构建：

```bash
# 单独运行（可在开发前先生成静态题库）
node ./scripts/build-dataset.mjs

# 生产构建会自动执行（prebuild 钩子会依次运行数据集构建与图标生成）
pnpm build
```

图片映射说明：

- `images.csv` 用于将 J 码（如 `LK0501`）映射到题图路径（如 `images/0.jpg`）。
- 构建时会将图片复制到 `public/questions/images/` 并在题目 JSON 中填充 `imageUrl` 字段。
- 选项文本中形如 `[F]LK0500.jpg` 的提示会被清理，不影响显示。

## 命令

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "prebuild": "node ./scripts/build-dataset.mjs && node ./scripts/generate-pwa-icons.mjs",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

- `dev`：本地开发（推荐先生成数据集以避免 404）
- `build`：生产构建，自动先执行 `prebuild`
- `start`：启动生产服务
- `lint`：代码检查

## 页面与路由

- `/`：首页
- `/practice?bank=A|B|C`：练习模式（支持顺序/随机、显示答案、保存/恢复进度、搜索）
- `/exam?bank=A|B|C`：模拟考试（真实规则抽题、倒计时、交卷与成绩）

`bank` 省略时默认 `A`。

## 键盘快捷键

- 通用：`← / →` 上一题 / 下一题
- 单选题：`1-9` 直接选择选项
- 练习（顺序模式）：`Enter` 打开搜索

## PWA 与图标

- 清单：`public/manifest.json`
- 图标：`public/pwa-icon.svg` 为源文件，构建阶段通过 `scripts/generate-pwa-icons.mjs` 生成 192/512 PNG 图标
- 安装：在兼容浏览器中通过地址栏或菜单“添加到主屏幕”

说明：未强制注册 Service Worker，离线能力主要依赖浏览器缓存与静态资源策略。

## 题目数据结构

静态题库 JSON 的单题结构如下：

```json
{
  "id": "LK0501",
  "codes": { "J": "LK0501", "P": "LK05" },
  "question": "题干文本",
  "options": [ { "key": "A", "text": "选项 A" }, { "key": "B", "text": "选项 B" } ],
  "answer_keys": ["A"],
  "type": "single",
  "pages": null,
  "imageUrl": "/questions/images/0.jpg"
}
```

类型定义参见：`src/types/question.ts`

## 隐私说明

仅在本地浏览器 `localStorage` 存储练习记录（题序、答案）、显示偏好与个别提示开关；不收集、不上传任何个人数据。

## 常见问题（FAQ）

- 构建后访问题库 JSON 404？
  - 先运行数据集构建脚本，确认 `public/questions/` 下存在 `A.json/B.json/C.json` 与 `images/` 目录。
- 图片不显示？
  - 确认 `images.csv` 存在且与题库匹配；构建脚本会将题图复制到 `public/questions/images/`。
- 练习搜索无效？
  - 搜索功能仅在“顺序模式”开启，支持 J 码与关键词。

## 致谢

- 题库来源：`TimXiedada/crac-amateur-radio-exam-questions-2025-csv`
- 技术栈：Next.js、React、Tailwind CSS、Radix UI、Lucide Icons


