# IronTrack (铁脉健身) · 项目核心规范与系统上下文 (AGENTS.md)

> **注意 (Note for AI Coding Assistants)**:  
> 本文件为本仓库全局核心上下文定义文件，由 IDE 与智能体自动加载。请在进行任何架构设计、代码编写、接口修改或部署调试时，严格遵守本文档所规定的技术选型、部署流程与业务约束，无需用户重复说明。

---

## 1. 项目概述与设计哲学

- **项目名称**：IronTrack (铁脉健身)
- **核心定位**：专为力量训练与健美健身者打造的**本地优先 (Local-First)**、支持**小主机私有云安全同步**的双模现代化健身追踪与渐进超负荷分析系统。
- **健身场景核心哲学 (Gym-First)**：
  - **离线极端可用**：健身房地下室、飞行模式下 100% 离线秒开，数据零丢失；
  - **单手极速录入**：告别键盘打字，提供 `+2.5kg`、`+5kg`、`+1次` 等微调步进胶囊；
  - **科学进阶指导**：内置 Epley 1RM 极限力量计算、有效总容量计算与渐进超负荷决策引擎（加重/减载/平台期）；
  - **硬核科技美学**：纯黑 OLED 底色、碳素灰卡片、霓虹荧光绿 (`#22c55e`) 与青色 (`#06b6d4`) 撞色。

---

## 2. 技术栈架构总览

### 2.1 移动端 App & Web 前端 (`/src`)
- **核心框架**：React 19 + TypeScript + Vite 8
- **样式体系**：Vanilla CSS + CSS Variables（极小体积，无第三方 CSS 运行时开销）
- **图标体系**：Lucide-react
- **存储引擎**：IndexedDB (`IronTrackDB`) 为主存储，LocalStorage 镜像容灾快照
- **跨端打包**：Capacitor 6.x（打包输出原生 Android APK，位于 `/android`）
- **离线机制**：Service Worker (`public/sw.js`)，支持 PWA 离线安装

### 2.2 服务端后端服务 (`/server`)
- **运行环境**：Node.js 20+ / Docker (基于 Alpine 极小镜像)
- **基础框架**：Express 4 + TypeScript (`tsx` 热重载)
- **数据库**：`better-sqlite3`（嵌入式高性能 SQLite，开启 `WAL` 模式与 `64MB` 内存缓存优化）
- **认证鉴权**：JWT 90天长效令牌 + bcryptjs 密码哈希 + 角色权限控制 (`admin` / `user`)
- **核心功能**：
  - `/api/health`: 连通性检测与延迟 Ping
  - `/api/auth/*`: 注册、登录、个人凭证校验
  - `/api/sync/*`: 增量数据双向同步，Last-Write-Wins 冲突消解
  - `/api/admin/*`: 平台总览、用户管理、全员训练流水透视、SQLite 数据库运维
- **PC 管理后台 (`/server/admin-web`)**：
  - 独立构建后由 Express 静态托管在 `/admin`，单端口服务访问，零额外常驻内存开销。

---

## 3. 部署架构与 J1900 家庭小主机规范

### 3.1 运行硬件约束 (Intel Celeron J1900)
- **硬件特性**：四核低功耗 x86_64 处理器，无 AVX2 扩展指令集，内存有限 (2GB~8GB)。
- **优化原则**：
  - 服务端常驻内存必须控制在 **40MB~60MB** 范围，严禁引入过重的全栈框架或运行时；
  - 数据库采用 SQLite 本地文件，不运行高耗能的独立 MySQL/PostgreSQL 进程；
  - 不在 J1900 本地运行 7B+ 大语言模型，未来 AI 功能通过 API 调用云端高性价比大模型 (如 DeepSeek / 通义千问)。

### 3.2 网络拓扑 (Tailscale Mesh VPN)
- J1900 小主机接入 Tailscale 虚拟组网，分配内网专属 IP；
- 手机端与 PC 端在异地通过 Tailscale 安全互联，无需向公网暴露端口或配置公网 IP。

### 3.3 Docker 编排与自动化运维 (`/server/docker-compose.yml`)
- 包含服务：
  - `gym-tracker-server`: 后端主服务，挂载宿主机 `./data:/app/data` 持久化数据库，限制内存 256MB；
  - `watchtower`: 自动巡检阿里云 ACR 镜像（每 300 秒），检测到新镜像平滑重启容器并清理废弃镜像；
- 脚本集合：
  - `server/deploy.sh`: J1900 一键首次部署；
  - `server/update.sh`: 升级前自动备份当前 SQLite 数据库至 `data/irontrack_backup_*.db`，平滑替换容器。

---

## 4. CI/CD 与构建发布链路

### 4.1 阿里云 ACR 镜像自动化构建 (`.github/workflows/docker-server.yml`)
- **触发路径**：`server/**` 发生变动且推送到 `main`/`master` 分支；
- **构建环境**：GitHub Actions `ubuntu-latest`，目标平台 `linux/amd64`；
- **发布目标**：阿里云容器镜像服务 (ACR) `${ALIYUN_ACR_REGISTRY}/${ALIYUN_ACR_NAMESPACE}/gym-tracker-server:latest`；
- **构建缓存**：开启 GitHub Actions 缓存 (`cache-from: type=gha`)，通常 30~60 秒内完成编译与推送；
- **镜像交付链路**：`代码提交 -> GitHub Actions 构建 x86 镜像 -> 阿里云 ACR -> J1900 Watchtower 自动拉取更新`。

### 4.2 安卓 APK 自动化打包 (`.github/workflows/build-apk.yml`)
- 触发路径：版本 Tag 或手动 workflow_dispatch；
- 构建流程：Vite 构建前端静态文件 -> Capacitor 同步 -> Gradle 编译原生 Android APK -> 输出发布 Release。

---

## 5. 核心业务与多角色数据模型规范

### 5.1 角色定义 (Roles & Permissions)
- **`user` (普通健身用户)**：
  - 可在手机 App 注册/登录，记录训练日志、自定义动作、计划模板、体测数据，并同步至私有云。
- **`admin` (系统管理员)**：
  - **同时具备所有普通用户能力**：可正常在移动端 App 登录并记录自己个人的训练数据；
  - **具备 PC 管理后台访问权限 (`/admin`)**：可进入数据大盘、查看全员训练日志、管理账号角色与状态、重置密码、下载数据库快照与执行维护。

### 5.2 数据库核心表结构 (`irontrack.db`)
1. `users`:
   - `id` (TEXT PK), `username` (TEXT UNIQUE), `password_hash` (TEXT), `role` (TEXT, 'admin'|'user'), `status` (TEXT, 'active'|'disabled'), `last_login_at` (INTEGER), `created_at` (INTEGER), `updated_at` (INTEGER)
2. `workouts`:
   - `id` (TEXT PK), `user_id` (TEXT FK), `date` (TEXT), `title` (TEXT), `duration_minutes` (INTEGER), `exercises_json` (TEXT), `notes` (TEXT), `created_at` (INTEGER), `updated_at` (INTEGER), `is_deleted` (INTEGER)
3. `custom_exercises`:
   - `id` (TEXT PK), `user_id` (TEXT FK), `data_json` (TEXT), `created_at` (INTEGER), `updated_at` (INTEGER), `is_deleted` (INTEGER)
4. `templates`:
   - `id` (TEXT PK), `user_id` (TEXT FK), `name` (TEXT), `category` (TEXT), `description` (TEXT), `exercises_json` (TEXT), `created_at` (INTEGER), `updated_at` (INTEGER), `is_deleted` (INTEGER)
5. `body_metrics`:
   - `id` (TEXT PK), `user_id` (TEXT FK), `date` (TEXT), `weight_kg` (REAL), `body_fat_percent` (REAL), `measurements_json` (TEXT), `notes` (TEXT), `created_at` (INTEGER), `updated_at` (INTEGER), `is_deleted` (INTEGER)

---

## 6. 开发与修改规范提示
1. **轻量至上**：不要在服务端引入庞大的重量级框架，保持 Express 极简分层（`controller` -> `service` -> `db`）。
2. **离线优先**：对移动端 App 任何修改必须保证在无网络环境下依然 100% 正常使用。
3. **数据安全**：任何破坏性更新或字段重构需保证向后兼容，更新脚本必须包含数据库自动备份。
