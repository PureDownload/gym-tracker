# IronTrack J1900 后端服务部署指南

本项目是 IronTrack 健身追踪器的私有云后端服务，专为低功耗家用服务器（如 J1900、N100、树莓派等）与 Tailscale 私有内网环境打造。

---

## 硬件与性能表现 (J1900)
- **内存占用**：运行时仅约 35MB ~ 45MB RAM
- **数据库**：SQLite 嵌入式存储 (自动开启 WAL 预写日志模式，高并发读写极佳)
- **CPU 负载**：单次同步耗时 < 10ms，闲时 CPU 占用 0%
- **安全性**：JWT 长效令牌认证 (90天免登)，全数据加盐加密

---

## 一键部署步骤 (在 J1900 小主机上)

### 方式 A：Docker Compose 部署 (推荐)

1. **拉取代码至小主机**：
   ```bash
   git clone https://github.com/your-username/gym-tracker.git
   cd gym-tracker/server
   ```

2. **启动服务**：
   ```bash
   docker compose up -d --build
   ```

3. **查看运行日志**：
   ```bash
   docker compose logs -f
   ```

4. **数据备份**：
   数据库持久化保存在当前目录下的 `./data/irontrack.db`，可直接复制此文件实现完整备份。

---

### 方式 B：直接 Node.js 运行

若小主机未安装 Docker，也可直接通过 Node.js 运行：

```bash
cd server
npm install -g pnpm
pnpm install
pnpm run build
node dist/index.js
```

可配合 `pm2` 实现后台常驻与开机自启：
```bash
npm install -g pm2
pm2 start dist/index.js --name "irontrack-server"
pm2 save
pm2 startup
```

---

## Tailscale 组网连接与 HTTPS 配置

### 1. 获取小主机 Tailscale IP
在 J1900 终端执行：
```bash
tailscale ip -4
# 输出形如：100.86.120.55
```
手机端连接时，服务器地址填写：`http://100.86.120.55:3001`

### 2. 启用官方免费 HTTPS (Tailscale Serve 最佳实践)
为避免移动端浏览器或安卓系统拦截纯 HTTP 请求，推荐开启 Tailscale 官方 HTTPS 反代：
```bash
tailscale serve https / http://127.0.0.1:3001
```
启用后，手机端可直接使用安全域名访问：
`https://<你的小主机名>.<你的tailnet名>.ts.net`
无需额外配置 SSL 证书，全球公认合法 Let's Encrypt 证书！
