# IronTrack J1900 后端服务部署指南 (Debian Docker)

本项目是 IronTrack 健身追踪器的私有云后端服务，专为低功耗家用服务器（如 Intel J1900、N100、树莓派等）与 Tailscale 私有内网环境深度优化打造。

---

## 硬件与性能指标 (J1900 真实表现)
- **内存占用**：运行时仅约 **35MB ~ 45MB RAM** (配备多阶段构建与依赖裁剪)
- **数据库**：SQLite 嵌入式存储 (自动开启 WAL 预写日志与 64MB 页缓存，读写极速且抗断电损坏)
- **CPU 负载**：单次数据同步耗时 < 10ms，常态闲时 CPU 占用 0%
- **安全性**：JWT 长效令牌认证 (90天免登)，全数据加盐加密
- **架构兼容**：原生适配 J1900 x86_64 (amd64) 架构，Alpine Linux 轻量容器

---

## 📦 部署包说明

项目根目录下已生成离线部署包：
`gym-tracker-server-docker.tar.gz` (体积仅约 30KB，解压后包含完整构建源码、TS预编译包、Docker配置与一键脚本)。

---

## 🚀 极简部署三步走 (在 J1900 Debian 上)

### 第一步：将部署包传输到 J1900
在 Mac / 本机终端中运行（替换为你的 J1900 IP 和用户名）：
```bash
scp gym-tracker-server-docker.tar.gz debian@<你的J1900的IP>:~/
```

### 第二步：解压部署包
SSH 登录到 J1900 Debian：
```bash
ssh debian@<你的J1900的IP>

# 解压部署包 (会自动解压出 gym-tracker-server 文件夹)
tar -xzvf gym-tracker-server-docker.tar.gz
cd gym-tracker-server
```

### 第三步：一键启动
执行内置的快速启动脚本：
```bash
./deploy.sh
```
> **提示**：如果 Debian 上还没安装 Docker，脚本会提示你运行：
> `curl -fsSL https://get.docker.com | bash`
> `sudo apt-get install -y docker-compose-plugin`

或者手动执行 Docker Compose 命令：
```bash
docker compose up -d --build
```

---

## 🖥️ PC 管理后台控制台访问 (`/admin`)

后端内置极简高性能的 PC 端管理后台，直接通过浏览器访问即可：
- **局域网访问**：`http://<你的J1900局域网IP>:3001/admin`
- **Tailscale 访问**：`http://<你的Tailscale-IP>:3001/admin`

### 核心功能与权限：
1. **多角色与权限体系**：
   - 自动自举：首位注册的用户将自动提升为**系统管理员 (`admin`)**；
   - 权限拦截：普通健身用户 (`user`) 仅可使用 App，无法越权访问管理后台；
   - 账号通用：管理员账号可**同时直接登录手机健身 App** 记录个人训练并同步；
2. **数据大盘 (Dashboard)**：全员举铁总吨位、近30日打卡走势、肌群偏好分布、三大项极限 1RM 荣誉榜、实时打卡动态；
3. **用户与权限管理**：查看所有账号、切换管理员/普通用户角色、启用/停用账号、重置用户密码、导出全量数据 JSON 备份；
4. **全员训练透视**：查看任意用户或全员的每次训练明细，包含各动作组数、重量 × 次数、估算 1RM；
5. **J1900 与 SQLite 运维**：监控宿主机内存占用与运行状态，一键 `VACUUM` 整理磁盘碎片，一键下载完整数据库二进制快照。

---

## 🛠️ 常用运维命令


| 操作 | 命令 |
| :--- | :--- |
| **查看实时运行日志** | `docker compose logs -f` |
| **查看容器运行状态** | `docker compose ps` |
| **停止服务** | `docker compose down` |
| **重启服务** | `docker compose restart` |
| **完整数据备份** | `cp data/irontrack.db ~/irontrack_backup_$(date +%Y%m%d).db` |

---

## 🌐 配合 Tailscale 远程访问

### 1. 查看 J1900 的 Tailscale IP
在 J1900 终端执行：
```bash
tailscale ip -4
# 例如输出：100.64.0.10
```
手机端 IronTrack App 中的服务器同步地址直接填写：`http://100.64.0.10:3001` (或局域网 IP `http://192.168.x.x:3001`)


### 2. (推荐) 开启 Tailscale HTTPS 安全域名
为了支持现代浏览器和移动端的安全加密连接，可直接使用 Tailscale 官方免费 HTTPS 反向代理：
```bash
tailscale serve https / http://127.0.0.1:3001
```
开启后，手机端可直接填入带有合规 Let's Encrypt 证书的安全域名：
`https://<你的小主机名>.<你的tailnet名>.ts.net`

---

## 🔄 后续代码更新与平滑升级

如果修改了后端代码，遵循两步即可极速平滑热更新：

1. **Mac 本机重新打包并传输**：
   ```bash
   cd server
   pnpm run pack:docker
   scp ../gym-tracker-server-docker.tar.gz debian@<J1900_IP>:~/
   ```

2. **J1900 上执行一键平滑升级**：
   ```bash
   tar -xzvf gym-tracker-server-docker.tar.gz
   cd gym-tracker-server
   ./update.sh
   ```
   > `update.sh` 会自动完成**数据库自动快照备份**、**重新编译镜像**、**平滑无感重启容器**以及**自动清理无用旧镜像**，数据 100% 零丢失。

## 🚀 GitHub Actions + 阿里云 ACR 自动构建与部署 (CI/CD)

本项目支持通过 GitHub Actions 自动编译 `linux/amd64` (J1900) 镜像并推送到**阿里云容器镜像服务 (ACR)**，国内拉取速度可达满宽带（10MB/s+）。

### 1. GitHub 仓库配置 (Settings -> Secrets and variables -> Actions)

在 GitHub 仓库添加以下凭据：

| 变量名 | 类型 | 说明 | 示例 |
| :--- | :--- | :--- | :--- |
| `ALIYUN_ACR_USERNAME` | Secret | 阿里云 ACR 登录用户名 (通常是主账号或子账号名) | `my_aliyun_user` |
| `ALIYUN_ACR_PASSWORD` | Secret | 阿里云 ACR 镜像仓库独立访问密码 | `********` |
| `ALIYUN_ACR_NAMESPACE`| Secret / Var | 阿里云 ACR 命名空间 | `irontrack-hub` |
| `ALIYUN_ACR_REGISTRY` | Secret / Var (可选) | 仓库地域域名 (默认: `registry.cn-hangzhou.aliyuncs.com`) | `registry.cn-shanghai.aliyuncs.com` |

---

### 2. J1900 自动部署模式 (二选一)

#### 模式 A：Watchtower 自动巡检（🌟 强烈推荐，零暴露安全方案）
无需向公网暴露 J1900 的 SSH 端口，J1900 内部的轻量 Watchtower 容器每隔 5 分钟自动检测阿里云 ACR，一旦发现新镜像便自动拉取、平滑重启并清理垃圾镜像。

1. 在 J1900 上登录一次阿里云镜像仓库：
   ```bash
   docker login --username=<你的阿里云用户名> registry.cn-hangzhou.aliyuncs.com
   ```
2. 在 `server/.env` 中配置镜像地址：
   ```bash
   SERVER_IMAGE=registry.cn-hangzhou.aliyuncs.com/<命名空间>/gym-tracker-server:latest
   ```
3. 启动应用并附带 Watchtower 守护进程：
   ```bash
   docker compose --profile auto-update up -d
   ```
之后你只需 `git push` 代码到 GitHub，GitHub Actions 会在 1 分钟内完成构建并推送到阿里云，J1900 几分钟内即可全自动无感更新！

#### 模式 B：GitHub Actions SSH 直连部署
如果你的 J1900 拥有公网 IP / DDNS 端口映射，或者配置了 Tailscale，可以在 GitHub 中配置：
- `J1900_SSH_HOST` (变量): 主机 IP 或 Tailscale IP
- `J1900_SSH_USER` (变量): 登录用户名（如 `debian`）
- `J1900_SSH_PORT` (变量): 端口（默认 22）
- `J1900_SSH_KEY` (Secret): SSH 登录私钥 (`id_rsa` / `id_ed25519`)

GitHub Actions 构建成功后会立即通过 SSH 登录 J1900 执行 `docker compose pull && docker compose up -d` 实现秒级即时部署。

---

详细技术原理、秒级回滚与数据库增量迁移方案请参阅完整技术文档：  
👉 [IronTrack 后端服务更新与维护指南 (SERVER_UPDATE_GUIDE.md)](../docs/SERVER_UPDATE_GUIDE.md)


