# 业余无线电执照考试模拟

[![Node 22+](https://img.shields.io/badge/Node-%E2%89%A522.0-339933?logo=node.js)](https://nodejs.org)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)

基于最新2025年题库的业余无线电执照考试模拟应用，支持A/B/C三类考试，提供完整的模拟考试、智能化练习、关键词搜索、报名照片处理等功能，采用Next.js 16 + React 19技术栈，支持PWA离线使用，数据本地存储确保隐私安全。

在线demo： [业余无线电考试](https://ham-exam.iots.vip/)  

## 功能特色

### 核心功能
- **📝 模拟考试**：A/B/C 三类考试，支持真实规则抽题、计时交卷和成绩统计
- **🎯 练习模式**：顺序/随机练习，进度保存，答案解析
- **🔍 智能搜索**：题号和关键词搜索（练习模式）
- **📱 照片处理**：报名照片尺寸调整工具

### 用户体验
- **⌨️ 键盘快捷键**：方向键切换题目，数字键选择选项
- **📋 答题卡**：快速导航，题目标记，进度跟踪
- **📱 移动优先**：响应式设计，PWA 支持，可离线使用
- **💾 本地存储**：隐私保护，所有数据保存在本地

## 快速开始

### 环境要求
- Node.js 22 或 24（推荐使用 `.tool-versions` 中的 Node.js 24）
- pnpm 11 或 npm；分别维护 `pnpm-lock.yaml` 和 `package-lock.json`

### 安装与运行

```bash
# 安装依赖
pnpm install --frozen-lockfile

# 本地开发
pnpm dev

# 静态检查（Next.js 16 的 build 不再自动运行 ESLint）
pnpm lint
pnpm exec tsc --noEmit

# 生产构建
pnpm build

# 启动生产服务
pnpm start
```

访问 `http://localhost:3000` 开始使用。

使用 npm 时，以 `npm ci` 安装，并将上面的 `pnpm` 脚本命令替换为 `npm run`；类型检查使用 `npx tsc --noEmit`。

### 依赖升级说明

- Next.js 16.3.8、React 19.3.0、Tailwind CSS 4.3.3，开发使用 Turbopack。
- 生产构建显式使用 `next build --webpack`，以生成 next-pwa 的 service worker；PWA 缓存配置使用插件内置类型和 `workboxOptions`。
- ESLint 使用最新兼容的 9.39.5（上游已停止支持），因 Next.js 所依赖的 React、import 和 JSX a11y 插件尚未声明支持 ESLint 10。TypeScript 使用 6.0.3，因 TypeScript ESLint 尚不支持 TypeScript 7。Node 类型定义跟随 Node.js 24。
- Radix 固定为已超过 pnpm 默认 24 小时发布冷静期的最新稳定版本；2026-10-05 发布的新版本未绕过该保护安装。
- npm 和 pnpm 均将 next-pwa 固定的 Workbox 依赖升级至 7.4.1，移除旧序列化依赖的安全风险。`pnpm-workspace.yaml` 仅允许所需的 `unrs-resolver` 原生安装脚本。
- 生产依赖审计无已知漏洞。完整开发依赖审计仍报告 `braces` 的未修复拒绝服务漏洞（[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)），经 `fast-glob` 影响 PWA 构建和 ESLint 工具链；未使用不兼容的包替换来隐藏告警。

### 数据集构建

项目首次运行需要构建题库数据：

```bash
# 单独构建数据集
node ./scripts/build-dataset.mjs
```

数据来源支持本地文件或远程仓库，详见脚本注释。

## 页面路由

- `/` - 首页，选择题库和模式
- `/practice?bank=A|B|C` - 练习模式
- `/exam?bank=A|B|C` - 模拟考试
- `/photo-processor` - 照片处理工具

## 快捷键

- `← / →` - 上一题 / 下一题
- `1-9` - 选择对应选项（单选题）
- `Enter` - 打开搜索（练习模式）

## 技术栈

- **Frontend**: Next.js 16, React 19, TypeScript 6
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **State**: Zustand
- **PWA**: @ducanh2912/next-pwa
- **Build**: Turbopack（开发）/ Webpack（生产，生成 PWA）

## 隐私与数据

- 所有数据存储在浏览器本地 (`localStorage`)
- 不收集或上传任何个人数据
- 支持 PWA，可离线使用

## 常见问题

- **题库为空或404？** 请先运行 `node ./scripts/build-dataset.mjs` 构建数据集
- **图片不显示？** 确认已正确构建数据集，图片文件应在 `public/questions/images/`
- **搜索无效？** 搜索功能仅在练习模式的顺序模式下可用

## 致谢
- **题库数据**: [TimXiedada/crac-amateur-radio-exam-questions-2025-csv](https://github.com/TimXiedada/crac-amateur-radio-exam-questions-2025-csv)

- **开源组件**: Next.js, React, Tailwind CSS, Radix UI, Lucide Icons
