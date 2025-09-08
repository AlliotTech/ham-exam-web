# 业余无线电执照考试模拟

[![Node 22+](https://img.shields.io/badge/Node-%E2%89%A522.0-339933?logo=node.js)](https://nodejs.org)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)

基于最新题库的在线模拟与练习应用，支持 A/B/C 三类考试，提供完整的考试模拟体验和便捷的练习工具。

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
- Node.js 22+
- pnpm / npm / yarn

### 安装与运行

```bash
# 安装依赖
pnpm install

# 本地开发
pnpm dev

# 生产构建
pnpm build

# 启动生产服务
pnpm start
```

访问 `http://localhost:3000` 开始使用。

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

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **State**: Zustand
- **PWA**: @ducanh2912/next-pwa
- **Build**: Turbopack

## 隐私与数据

- 所有数据存储在浏览器本地 (`localStorage`)
- 不收集或上传任何个人数据
- 支持 PWA，可离线使用

## 常见问题

- **题库为空或404？** 请先运行 `node ./scripts/build-dataset.mjs` 构建数据集
- **图片不显示？** 确认已正确构建数据集，图片文件应在 `public/questions/images/`
- **搜索无效？** 搜索功能仅在练习模式的顺序模式下可用

## 致谢
- 本项目 CDN 加速及安全防护由 [Tencent EdgeOne](https://edgeone.ai/?from=github) 赞助：EdgeOne 提供长期有效的免费套餐，包含不限量的流量和请求，覆盖中国大陆节点，且无任何超额收费，感兴趣的朋友可以点击下面的链接领取：  [<img src="https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png" alt="图片" style="height: 1em; vertical-align: middle;">](https://edgeone.ai/?from=github) [亚洲最佳CDN、边缘和安全解决方案 - Tencent EdgeOne](https://edgeone.ai/zh?from=github)

- **题库数据**: [TimXiedada/crac-amateur-radio-exam-questions-2025-csv](https://github.com/TimXiedada/crac-amateur-radio-exam-questions-2025-csv)

- **开源组件**: Next.js, React, Tailwind CSS, Radix UI, Lucide Icons
