# <p align="center">⚡️ IronTrack (铁脉健身)</p>

<p align="center">
  <strong>专为力量训练与健美爱好者打造的轻量、硬核、本地优先 (Local-First) 健身追踪与超负荷渐进分析应用</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.x-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.x-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Capacitor-8.x-119EFF?logo=capacitor" alt="Capacitor" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## 📖 目录
- [✨ 核心亮点](#-核心亮点)
- [🛠️ 技术栈选型](#️-技术栈选型)
- [🚀 快速开始](#-快速开始)
- [📱 安卓打包构建 (本地 CLI / GitHub Actions)](#-安卓打包构建)
- [📐 架构设计与文档](#-架构设计与文档)
- [📄 开源协议](#-开源协议)

---

## ✨ 核心亮点

- ⚡️ **极速单手录入 (Gym-First UX)**：专为健身房手滑、出汗、间歇心率高场景设计，告别键盘打字，提供 `+2.5kg`、`+5kg`、`+1次` 等微调步进胶囊。
- 🛡️ **本地优先与 100% 离线秒开**：基于 **IndexedDB + LocalStorage 双模持久化**，地下室、无网络环境下流畅使用，数据完全掌握在自己手中。
- 📈 **科学渐进超负荷分析**：自研原生轻量级 SVG 渲染引擎，动态绘制 1RM 极限力量与训练容量趋势曲线，智能推荐加重决策。
- ⏱️ **内置组间休息计时器**：基于原生 Web Audio API 振荡器实时合成蜂鸣提醒，支持手机振动反馈。
- 📅 **智能打卡日历与历史回溯**：直观展示练/休状态，一键将历史任意一天的训练计划快速复制到今天。
- 📦 **开箱即用跨端支持**：集成 Capacitor，既可作为 PWA Web 应用运行，也可快速编译为 Android 原生 APK。

---

## 🛠️ 技术栈选型

| 模块 | 技术方案 | 特点 |
| :--- | :--- | :--- |
| **前端框架** | React 19 + TypeScript | 极致性能与严谨的类型定义 |
| **构建工具** | Vite 8 | 秒级热重载，生产包 Gzip 仅 ~90KB |
| **样式系统** | Vanilla CSS + CSS Variables | OLED 纯黑硬核深色系，零运行时负担 |
| **持久化** | IndexedDB + LocalStorage 容灾 | 本地大容量结构化异步存储，支持 JSON 导出与备份 |
| **图表展示** | 原生 SVG 响应式图表引擎 | 零体积开销，支持触控十字游标与平滑贝塞尔曲线 |
| **跨端容器** | Capacitor 8.x | 纯命令行打包，支持一键导出 Android 原生 APK |

---

## 🚀 快速开始

### 环境要求
- Node.js 18+ (推荐 Node.js 20+)
- npm 或 pnpm / yarn

### 1. 克隆代码并安装依赖
```bash
git clone https://github.com/PureDownload/gym-tracker.git
cd gym-tracker
npm install
```

### 2. 启动本地开发服务
```bash
npm run dev
```
打开浏览器访问控制台输出的地址（如 `http://localhost:5173`）即可体验。

### 3. 构建生产包
```bash
npm run build
```

---

## 📱 安卓打包构建

本项目支持两种轻量化打包方案（**无需安装几 GB 的 Android Studio**）：

1. **GitHub Actions 云端自动构建**：每次推送代码至 `main` 分支或在 GitHub Actions 页面手动点击，云端服务器将在 2 分钟内自动编译生成 `IronTrack-Debug-APK` 并提供下载。
2. **Mac 本地命令行极速构建**：
   ```bash
   npm run build:apk
   ```
   > 详细流程可参阅项目内置指南：[零 IDE 纯命令行打包 Android APK 实战指南](./CLI_ANDROID_BUILD_GUIDE.md) 与 [标准 Android 打包指南](./ANDROID_BUILD_GUIDE.md)。

---

## 📐 架构设计与文档

详细的模块结构、数据模型与底层算法设计请查阅技术文档：
- 📘 [技术方案与系统架构设计 (TECH_ARCHITECTURE.md)](./TECH_ARCHITECTURE.md)
- 📘 [零 IDE 纯命令行与 GitHub 云端打包指南 (CLI_ANDROID_BUILD_GUIDE.md)](./CLI_ANDROID_BUILD_GUIDE.md)

---

## 📄 开源协议

本项目基于 [MIT License](./LICENSE) 开放源代码。
